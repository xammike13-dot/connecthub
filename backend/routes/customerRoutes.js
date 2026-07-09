import express from 'express';
import {
  getDashboardStats,
  getMyOrders,
  getMyBookings,
  getMyRides,
} from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Orders
router.get('/orders', getMyOrders);

// Bookings (rentals)
router.get('/bookings', getMyBookings);

// Rides
router.get('/rides', getMyRides);

export default router;