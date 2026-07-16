import express from 'express';
import {
  initiateMpesaPayment,
  initiateMpesaPaymentWithRider,
  verifyMpesaPayment,
  checkPaymentStatus,
  mpesaCallback,
  calculateRideFareEstimate,
  initiatePayment,
  completeTransaction,
  getTransactionHistory,
  getTransaction,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// M-Pesa callback route - NO authentication required (Daraja webhook)
// This must be defined BEFORE the protect middleware
router.post('/mpesa/callback', mpesaCallback);

// All other payment routes require authentication
router.use(protect);

// Fare estimate for ride booking
router.post('/ride-fare-estimate', calculateRideFareEstimate);

// M-Pesa specific routes for Bodaboda
router.post('/mpesa/stk-push', initiateMpesaPayment);
router.post('/mpesa/stk-push-with-rider', initiateMpesaPaymentWithRider);
router.get('/mpesa/verify/:transactionRef', verifyMpesaPayment);
router.get('/status/:transactionRef', checkPaymentStatus);

// Generic payment endpoints (for frontend compatibility)
// /initiate - For rentals and marketplace orders (uses entityType/entityId)
router.post('/initiate', initiatePayment);
// /initiate-ride - For bodaboda rides (uses pickupLocation/dropoffLocation)
router.post('/initiate-ride', initiateMpesaPayment);
// /initiate-with-rider - For rides with selected rider
router.post('/initiate-with-rider', initiateMpesaPaymentWithRider);
router.get('/verify/:transactionRef', verifyMpesaPayment);

// Complete transaction (confirm receipt/completion)
router.post('/complete/:transactionRef', completeTransaction);

// Transaction history routes
router.get('/transactions', getTransactionHistory);
router.get('/transactions/:transactionRef', getTransaction);

export default router;
