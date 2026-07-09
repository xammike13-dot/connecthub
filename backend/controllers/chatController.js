import mongoose from 'mongoose';
import { Message, Conversation } from '../models/Chat.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { createNotification } from './notificationController.js';

/**
 * Send a message (with payment check)
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { receiverId, content, type = 'text', mediaUrl, entityType, entityId } = req.body;

  if (!receiverId || !content) {
    throw new ResponseError('Receiver and message content required', 400);
  }

  // Check payment requirement
  if (entityType && entityId) {
    const transaction = await Transaction.findOne({
      customer: senderId,
      relatedEntity: entityId,
      relatedEntityType: entityType,
      status: { $in: ['paid', 'completed'] },
    });

    if (!transaction) {
      return res.status(403).json({
        success: false,
        message: 'Payment required to unlock communication',
        requiresPayment: true,
      });
    }
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ResponseError('Receiver not found', 404);
  }

  // Create message
  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    content,
    type,
    mediaUrl,
  });

  // Get or create conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      relatedEntity: entityId,
      relatedEntityType: entityType,
      messages: [message._id],
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });
  } else {
    conversation.messages.push(message._id);
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  // Emit Socket.io event
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${receiverId}`).emit('new_message', {
      conversationId: conversation._id,
      message: {
        ...message.toObject(),
        senderName: req.user.name,
        senderAvatar: req.user.avatar,
      },
    });
  }

  // Create notification for new message
  try {
    await createNotification(
      receiverId,
      'message',
      'New Message',
      `${req.user.name}: ${content.substring(0, 100)}`,
      { senderId, conversationId: conversation._id, messageId: message._id },
      `/chat/${conversation._id}`,
      `/chat/${conversation._id}`,
      req
    );
  } catch (err) {
    console.error('[Chat message notification failed]', err);
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: message,
  });
});

/**
 * Get conversation with a user
 */
export const getConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name avatar email phone')
    .populate('lastMessage');

  if (!conversation) {
    throw new ResponseError('Conversation not found', 404);
  }

  // Check if user is participant
  if (!conversation.participants.some(p => p._id.toString() === userId.toString())) {
    throw new ResponseError('Not authorized to view this conversation', 403);
  }

  // Get messages with pagination
  const skip = (page - 1) * limit;
  const messages = await Message.find({
    _id: { $in: conversation.messages },
  })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Mark messages as read
  await Message.updateMany(
    {
      receiver: userId,
      _id: { $in: conversation.messages },
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );

  res.status(200).json({
    success: true,
    data: {
      conversation: {
        ...conversation.toObject(),
        participants: conversation.participants,
      },
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        total: conversation.messages.length,
        pages: Math.ceil(conversation.messages.length / limit),
      },
    },
  });
});

/**
 * Get all conversations for user
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate('participants', 'name avatar email phone')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Conversation.countDocuments({
    participants: userId,
  });

  // Get unread counts
  const conversationsWithCounts = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        receiver: userId,
        _id: { $in: conv.messages },
        read: false,
      });

      return {
        ...conv.toObject(),
        unreadCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: conversationsWithCounts,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get unread message count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const count = await Message.countDocuments({
    receiver: userId,
    read: false,
  });

  res.status(200).json({
    success: true,
    data: {
      unreadCount: count,
    },
  });
});

/**
 * Mark message as read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  const message = await Message.findByIdAndUpdate(
    messageId,
    {
      read: true,
      readAt: new Date(),
    },
    { new: true }
  );

  if (!message) {
    throw new ResponseError('Message not found', 404);
  }

  if (message.receiver.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to mark this message', 403);
  }

  // Emit Socket.io event
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${message.sender}`).emit('message_read', {
      messageId: message._id,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Message marked as read',
    data: message,
  });
});

/**
 * Delete message
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ResponseError('Message not found', 404);
  }

  if (
    message.sender.toString() !== userId.toString() &&
    message.receiver.toString() !== userId.toString()
  ) {
    throw new ResponseError('Not authorized to delete this message', 403);
  }

  // Soft delete - add userId to deletedBy
  if (!message.deletedBy.includes(userId)) {
    message.deletedBy.push(userId);
    await message.save();
  }

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});

/**
 * Get messages between two users
 */
export const getDirectMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { otherUserId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Message.countDocuments({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  });

  // Mark as read
  await Message.updateMany(
    {
      receiver: userId,
      sender: otherUserId,
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );

  res.status(200).json({
    success: true,
    data: messages.reverse(),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});
