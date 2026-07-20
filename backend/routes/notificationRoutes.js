import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  verifyWhatsAppWebhook,
  handleWhatsAppMessage,
  subscribePush,
  unsubscribePush,
  getVapidKey,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// WhatsApp webhook verification endpoint (public - no authentication)
// GET /api/notifications/webhook
router.get('/webhook', verifyWhatsAppWebhook);

// WhatsApp message webhook endpoint (public - no authentication)
// POST /api/notifications/webhook
router.post('/webhook', handleWhatsAppMessage);

// Get VAPID public key (public - no authentication)
router.get('/vapid-key', getVapidKey);

// All routes below require authentication
router.use(protect);

// Subscribe/unsubscribe from Push Notifications
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);

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
