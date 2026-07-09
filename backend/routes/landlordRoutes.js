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
router.use(authorize('landlord'));

router.get('/dashboard/stats', getDashboardStats);

router.get('/wallet', getWallet);

router.get('/new-bookings', getNewBookings);

router.get('/bookings', getAllBookings);

router.get('/my-properties', getMyProperties);

router.get('/my-rentals', getMyRentals);

router.get(
  '/my-rentals/:rentalId',
  validateObjectId('rentalId'),
  getMyRental
);

router.patch(
  '/my-rentals/:rentalId/toggle-availability',
  validateObjectId('rentalId'),
  toggleAvailability
);

export default router;