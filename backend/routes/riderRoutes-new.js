import express from 'express';
import {
  getDashboardStats,
  getRiderProfile,
  updateRiderProfile,
  getRiderEarnings,
  getRiderLocation,
  updateOnlineStatus,
  getEarningsTrend,
} from '../controllers/riderController.js';
import {
  getRiderDeliveries,
  riderAcceptDelivery,
  riderDeclineDelivery,
  updateDeliveryStage,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and rider role
router.use(protect);
router.use(authorize('rider'));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Profile routes
router.get('/profile', getRiderProfile);
router.put('/profile', updateRiderProfile);

// Earnings and location
router.get('/earnings', getRiderEarnings);
router.get('/location', getRiderLocation);

// Analytics
router.get('/analytics/earnings-trend', getEarningsTrend);

// Online status
router.post('/status/online', updateOnlineStatus);

// Delivery management routes for riders
router.get('/deliveries', getRiderDeliveries);
router.get('/deliveries/available', (req, res, next) => {
  req.query.type = 'available';
  return getRiderDeliveries(req, res, next);
});
router.get('/deliveries/my-deliveries', (req, res, next) => {
  req.query.type = 'my_active';
  return getRiderDeliveries(req, res, next);
});
router.post('/deliveries/:orderId/accept', riderAcceptDelivery);
router.post('/deliveries/:orderId/decline', riderDeclineDelivery);
router.put('/deliveries/:orderId/stage', updateDeliveryStage);

export default router;
