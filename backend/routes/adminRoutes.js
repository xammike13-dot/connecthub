import express from 'express';
import {
  getDashboardStats,
  getAnalytics,
  getUsers,
  getUser,
  updateUserStatus,
  getTransactions,
  getWithdrawals,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getDailyRevenue,
  getDisputeReport,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard stats
router.get('/stats', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/revenue/daily', getDailyRevenue);
router.get('/disputes/report', getDisputeReport);

// User management
router.get('/users', getUsers);
router.get('/users/:userId', getUser);
router.put('/users/:userId/status', updateUserStatus);

// Transaction management
router.get('/transactions', getTransactions);

// Withdrawal management
router.get('/withdrawals', getWithdrawals);
router.get('/withdrawals/pending', getPendingWithdrawals);
router.put('/withdrawals/:withdrawalId/approve', approveWithdrawal);
router.put('/withdrawals/:withdrawalId/reject', rejectWithdrawal);

export default router;
