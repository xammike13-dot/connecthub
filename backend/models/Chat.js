import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    mediaUrl: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    deletedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: Date,
    relatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedEntityType: {
      type: String,
      enum: ['Order', 'Rental', 'RideRequest'],
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    blockedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Compound index for participant lookup
conversationSchema.index({ participants: 1 });
conversationSchema.index({ relatedEntity: 1, relatedEntityType: 1 });

const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

export { Message, Conversation };