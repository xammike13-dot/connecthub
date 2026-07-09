import express from 'express';
import {
  createRideRequest,
  getAvailableRides,
  getCustomerRides,
  getRiderRides,
  getRide,
  acceptRide,
  declineRide,
  updateRideStatus,
  confirmRideCompletion,
  updateRiderLocation,
  cancelRide,
  archiveRide,
  deleteRideForRider,
  calculateRideFare,
  calculateFareWithRider,
  getFareEstimate,
} from '../controllers/rideController.js';
import { protect, authorize } from '../middleware/auth.js';
import { protectRiderCommunication } from '../middleware/communicationAccess.js';

const router = express.Router();

// Protected routes
router.use(protect);

// Customer routes
// BUSINESS RULE 1: Rides should only be created AFTER payment confirmation
// The createRideRequest endpoint is disabled - rides are created in payment callback
// router.post('/', authorize('customer'), createRideRequest);
router.get('/customer/my-rides', authorize('customer'), getCustomerRides);
router.delete('/:rideId/cancel', cancelRide);
router.put('/:rideId/archive', authorize('customer'), archiveRide);

// Rider routes
router.get('/rider/available', authorize('rider'), getAvailableRides);
router.get('/rider/my-rides', authorize('rider'), getRiderRides);
router.post('/:rideId/accept', authorize('rider'), acceptRide);
router.post('/:rideId/decline', authorize('rider'), declineRide);
router.post('/:rideId/location', authorize('rider'), updateRiderLocation);
router.delete('/:rideId/delete', authorize('rider'), deleteRideForRider);

// Shared routes
router.get('/:rideId', getRide);
router.put('/:rideId/status', updateRideStatus);

// Customer confirmation route
router.put('/:rideId/confirm-completion', authorize('customer'), confirmRideCompletion);

// Fare calculation routes (public or authenticated)
router.post('/calculate-fare', calculateRideFare);
router.post('/calculate-fare-with-rider', calculateFareWithRider);
router.get('/estimate-fare', getFareEstimate);

// Communication requires payment
router.use(protectRiderCommunication);

export default router;
