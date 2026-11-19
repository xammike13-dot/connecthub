import express from 'express';
import {
  getDashboardStats,
  getRiderProfile,
  updateRiderProfile,
  getRiderEarnings,
  getRiderLocation,
  updateOnlineStatus,
  updateRiderGPSLocation,
  getNearbyRiders,
  getAvailableBodaRiders,
  getActiveRide,
  getRiderNotifications,
  removeProfilePhoto,
  removeMotorcyclePhoto,
} from '../controllers/riderController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// =====================================================
// NEW MODEL: Available Boda Riders for Olafasta Customer Ordering
// Database fetching only, no GPS/radius requirement
// =====================================================
router.get('/available-boda-riders', optionalAuth, getAvailableBodaRiders);
router.get('/new-model/available-riders', optionalAuth, getAvailableBodaRiders);

// =====================================================
// OLD MODEL: Nearby Riders Endpoint
// Preserved untouched with GPS coordinate/radius/working hours logic
// =====================================================
router.get('/nearby', protect, getNearbyRiders);

// =====================================================
// RIDER-ONLY ROUTES (All routes below require rider role)
// =====================================================
router.use(protect);
router.use(authorize('rider'));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Profile routes
router.get('/profile', getRiderProfile);
router.put('/profile', updateRiderProfile);
router.delete('/profile/photo', removeProfilePhoto);
router.delete('/profile/motorcycle/photo', removeMotorcyclePhoto);

// Earnings
router.get('/earnings', getRiderEarnings);

// Location
router.get('/location', getRiderLocation);
router.post('/location/update', updateRiderGPSLocation);

// Online status
router.post('/status/online', updateOnlineStatus);

// Active ride
router.get('/active-ride', getActiveRide);

// Notifications
router.get('/notifications', getRiderNotifications);

export default router;
