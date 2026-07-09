import express from 'express';
import {
  createRental,
  getRentals,
  getRental,
  updateRental,
  deleteRental,
  getLandlordRentals,
  getMyRentals,
  toggleAvailability,
  bookRental,
  getMyBookings,
  updateBookingStatus,
  setMoveInDate,
  confirmMoveIn,
  cancelBooking,
  archiveBooking,
  toggleRentalFavorite,
  getFavoriteRentals,
  sendRentReminders,
  payMonthlyRent,
  trackRentalView,
} from '../controllers/rentalController.js';

import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

/**
 * PUBLIC ROUTES
 */
router.get('/', getRentals);

router.get(
  '/landlord/:landlordId',
  validateObjectId('landlordId'),
  getLandlordRentals
);

// Track rental view (protected for customers)
router.post(
  '/:rentalId/view',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  trackRentalView
);

/**
 * PROTECTED ROUTES
 */
router.use(protect);

/**
 * LANDLORD ROUTES
 */
router.get(
  '/my-rentals',
  authorize('landlord'),
  getMyRentals
);

router.post(
  '/',
  authorize('landlord'),
  createRental
);

router.put(
  '/:rentalId',
  authorize('landlord'),
  validateObjectId('rentalId'),
  updateRental
);

router.delete(
  '/:rentalId',
  authorize('landlord'),
  validateObjectId('rentalId'),
  deleteRental
);

router.patch(
  '/:rentalId/toggle-availability',
  authorize('landlord'),
  validateObjectId('rentalId'),
  toggleAvailability
);

/**
 * CUSTOMER BOOKING ROUTES
 */
router.post(
  '/:rentalId/book',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  bookRental
);

router.get(
  '/bookings/my-bookings',
  protect,
  authorize('customer'),
  getMyBookings
);

router.post(
  '/:rentalId/bookings/:bookingId/cancel',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  cancelBooking
);

router.put(
  '/:rentalId/bookings/:bookingId/archive',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  archiveBooking
);

// Customer set move-in date route
router.put(
  '/:rentalId/bookings/:bookingId/set-move-in-date',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  setMoveInDate
);

// Customer move-in confirmation route
router.put(
  '/:rentalId/bookings/:bookingId/confirm-move-in',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  confirmMoveIn
);

// Customer pay monthly rent route
router.post(
  '/:rentalId/bookings/:bookingId/pay-rent',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  payMonthlyRent
);

/**
 * CUSTOMER FAVORITE ROUTES
 */
router.post(
  '/:rentalId/favorite',
  protect,
  authorize('customer'),
  validateObjectId('rentalId'),
  toggleRentalFavorite
);

router.get(
  '/favorites/my-favorites',
  protect,
  authorize('customer'),
  getFavoriteRentals
);

/**
 * LANDLORD BOOKING MANAGEMENT
 */
router.put(
  '/:rentalId/bookings/:bookingId/status',
  protect,
  authorize('landlord'),
  validateObjectId('rentalId'),
  updateBookingStatus
);

/**
 * SINGLE RENTAL
 * MUST BE LAST
 */
router.get(
  '/:rentalId',
  validateObjectId('rentalId'),
  getRental
);

/**
 * ADMIN/CRON ROUTES
 * For scheduled jobs
 */
router.post(
  '/cron/send-rent-reminders',
  protect,
  authorize('admin'),
  sendRentReminders
);

export default router;
