import express from 'express';
import {
  sendEmailVerificationCode,
  verifyEmailCode,
  getVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from '../controllers/verificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Email verification endpoints (primary method)
router.post('/send-email', sendEmailVerificationCode);
router.post('/verify-email', verifyEmailCode);

// Verification status
router.get('/status', protect, getVerificationStatus);

// Legacy phone verification endpoints (disabled, kept for reference)
router.post('/send-phone', sendPhoneVerificationCode);
router.post('/verify-phone', verifyPhoneCode);

export default router;