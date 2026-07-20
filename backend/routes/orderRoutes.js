import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  confirmDelivery,
  cancelOrder,
  acceptOrder,
  businessCancelOrder,
  markOrderDelivered,
  deleteOrder,
  archiveOrder,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Customer routes
router.post('/', authorize('customer'), createOrder);
router.delete('/:orderId/cancel', authorize('customer'), cancelOrder);
router.put('/:orderId/archive', authorize('customer'), archiveOrder);
router.put('/:orderId/confirm-delivery', authorize('customer'), confirmDelivery);

// Business routes
router.put('/:orderId/status', authorize('business', 'assistant'), updateOrderStatus);
router.put('/:orderId/accept', authorize('business', 'assistant'), acceptOrder);
router.put('/:orderId/cancel', authorize('business', 'assistant'), businessCancelOrder);
router.put('/:orderId/delivered', authorize('business', 'assistant'), markOrderDelivered);

// Delete order (both customer and business can delete their own completed/cancelled orders)
router.delete('/:orderId', deleteOrder);

// Shared routes
router.get('/', getOrders);
router.get('/:orderId', validateObjectId('orderId'), getOrder);

export default router;