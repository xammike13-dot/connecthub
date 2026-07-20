import express from 'express';
import {
  getDashboardStats,
  getProfile,
  updateProfile,
  getWallet,
  getWithdrawals,
  getMyProducts,
  getMyServices,
  getOrders,
  getCustomers,
} from '../controllers/businessController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and business or assistant role
router.use(protect);
router.use(authorize('business', 'assistant'));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Wallet routes (strictly restricted to business role only, assistant is blocked)
router.get('/wallet', authorize('business'), getWallet);
router.get('/withdrawals', authorize('business'), getWithdrawals);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Customers
router.get('/customers', getCustomers);

// Products - use specific paths that don't conflict with ID patterns
router.get('/my-products', getMyProducts);

// Services (alias for products, for consistency)
router.get('/my-services', getMyServices);

// Orders
router.get('/orders', getOrders);

export default router;
