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
  getRiderDeliveries,
  riderAcceptDelivery,
  riderDeclineDelivery,
  updateDeliveryStage,
  disputeOrder,
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
router.post('/:orderId/dispute', authorize('customer'), disputeOrder);

// Rider delivery management routes
router.get('/rider/deliveries', authorize('rider'), getRiderDeliveries);
router.post('/:orderId/rider/accept', authorize('rider'), riderAcceptDelivery);
router.post('/:orderId/rider/decline', authorize('rider'), riderDeclineDelivery);
router.put('/:orderId/rider/stage', authorize('rider'), updateDeliveryStage);

// Business routes
router.put('/:orderId/status', authorize('business', 'assistant', 'admin'), updateOrderStatus);
router.patch('/:orderId/status', authorize('business', 'assistant', 'admin'), updateOrderStatus);
router.put('/:orderId/accept', authorize('business', 'assistant'), acceptOrder);
router.put('/:orderId/cancel', authorize('business', 'assistant'), businessCancelOrder);
router.put('/:orderId/delivered', authorize('business', 'assistant'), markOrderDelivered);

// Delete order (both customer and business can delete their own completed/cancelled orders)
router.delete('/:orderId', deleteOrder);

// Shared routes
router.get('/', getOrders);
router.get('/:orderId', validateObjectId('orderId'), getOrder);

export default router;