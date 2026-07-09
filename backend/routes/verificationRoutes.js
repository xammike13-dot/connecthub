import express from 'express';
import {
  sendPhoneVerificationCode,
  verifyPhoneCode,
  getVerificationStatus,
} from '../controllers/verificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/send-phone', sendPhoneVerificationCode);
router.post('/verify-phone', verifyPhoneCode);
router.get('/status', protect, getVerificationStatus);

export default router;
