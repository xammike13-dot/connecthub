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

export default router;
