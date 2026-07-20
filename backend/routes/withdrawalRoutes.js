import express from 'express';
import {
  requestWithdrawal,
  processWithdrawal,
  getWithdrawalHistory,
  getWithdrawal,
  addWithdrawalMethod,
  setDefaultWithdrawalMethod,
  getWalletDetails,
  getEarningsStats,
} from '../controllers/withdrawalController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Block assistants from withdrawal and financial endpoints
router.use((req, res, next) => {
  if (req.user && req.user.role === 'assistant') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Business assistants are not authorized to access financial or withdrawal endpoints.',
    });
  }
  next();
});

// Withdrawal routes
router.post('/request', requestWithdrawal);
router.get('/history', getWithdrawalHistory);

// Wallet and earnings (must be before /:withdrawalId)
router.get('/wallet/details', getWalletDetails);
router.get('/earnings/stats', getEarningsStats);

// Withdrawal method management
router.post('/methods', addWithdrawalMethod);
router.put('/methods/default', setDefaultWithdrawalMethod);

router.get('/:withdrawalId', getWithdrawal);

// Admin-only route for processing withdrawals
router.put('/:withdrawalId/process', restrictTo('admin'), processWithdrawal);

export default router;