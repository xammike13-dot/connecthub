import express from 'express';
console.log('Loading routes/landlordRoutes.js');
import {
  getDashboardStats,
  getMyProperties,
  getMyRentals,
  getMyRental,
  toggleAvailability,
  getNewBookings,
  getAllBookings,
  getWallet,
} from '../controllers/landlordController.js';

import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard/stats', authorize('landlord'), getDashboardStats);

router.get('/wallet', authorize('landlord'), getWallet);

router.get('/new-bookings', authorize('landlord', 'caretaker'), getNewBookings);

router.get('/bookings', authorize('landlord', 'caretaker'), getAllBookings);

router.get('/my-properties', authorize('landlord', 'caretaker'), getMyProperties);

router.get('/my-rentals', authorize('landlord', 'caretaker'), getMyRentals);

router.get(
  '/my-rentals/:rentalId',
  validateObjectId('rentalId'),
  authorize('landlord', 'caretaker'),
  getMyRental
);

router.patch(
  '/my-rentals/:rentalId/toggle-availability',
  validateObjectId('rentalId'),
  authorize('landlord', 'caretaker'),
  toggleAvailability
);

export default router;