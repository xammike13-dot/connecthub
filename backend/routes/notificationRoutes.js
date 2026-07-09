import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.post('/read-all', markAllAsRead);

// Delete all notifications
router.delete('/', deleteAllNotifications);

// Mark single notification as read
router.post('/:notificationId/read', markAsRead);

// Delete single notification
router.delete('/:notificationId', deleteNotification);

export default router;