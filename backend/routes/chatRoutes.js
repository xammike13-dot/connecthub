import express from 'express';
import {
  sendMessage,
  getConversation,
  getConversations,
  getUnreadCount,
  markAsRead,
  deleteMessage,
  getDirectMessages,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// Send message
router.post('/', sendMessage);

// Get conversations
router.get('/', getConversations);
router.get('/count/unread', getUnreadCount);

// Get conversation by ID
router.get('/:conversationId', getConversation);

// Get direct messages with a user
router.get('/direct/:otherUserId', getDirectMessages);

// Message actions
router.put('/:messageId/read', markAsRead);
router.delete('/:messageId', deleteMessage);

export default router;
