import express from 'express';
import {
  getDashboardStats,
  getAnalytics,
  getUsers,
  getUser,
  updateUserStatus,
  deleteUser,
  getAdminOrders,
  updateAdminOrder,
  getAdminProperties,
  getAdminBookings,
  flagAdminProperty,
  getAdminRides,
  updateAdminRide,
  createAdminReport,
  getAdminReports,
  updateAdminReportStatus,
  broadcastNotification,
  getPlatformHealth,
  getRecentActivity,
  getTransactions,
  getWithdrawals,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getDailyRevenue,
  getDisputeReport,
  getAdminProducts,
  getAdminProductsStats,
  getAdminProductById,
  updateAdminProductStatus,
  deleteAdminProduct,
  flagAdminProduct,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Disable caching for all admin responses
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Dashboard stats
router.get('/stats', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard', getDashboardStats); // Required alias endpoint

// Analytics
router.get('/analytics', getAnalytics);
router.get('/revenue/daily', getDailyRevenue);
router.get('/disputes/report', getDisputeReport);

// User management
router.get('/users', getUsers);
router.get('/users/:userId', getUser);
router.put('/users/:userId/status', updateUserStatus);
router.delete('/users/:userId', deleteUser);

// Product management
router.get('/products', getAdminProducts);
router.get('/products/stats', getAdminProductsStats);
router.get('/products/:id', getAdminProductById);
router.patch('/products/:id/status', updateAdminProductStatus);
router.delete('/products/:id', deleteAdminProduct);
router.patch('/products/:id/flag', flagAdminProduct);

// Order management
router.get('/orders', getAdminOrders);
router.put('/orders/:orderId', updateAdminOrder);

// Rental / Listing management
router.get('/properties', getAdminProperties);
router.get('/rentals', getAdminProperties); // Alias endpoint
router.get('/bookings', getAdminBookings);
router.put('/properties/:rentalId/flag', flagAdminProperty);

// Ride management
router.get('/rides', getAdminRides);
router.put('/rides/:rideId', updateAdminRide);

// Reports/Complaints management
router.get('/reports', getAdminReports);
router.post('/reports', createAdminReport);
router.put('/reports/:reportId', updateAdminReportStatus);

// Broadcast Notification
router.post('/broadcast', broadcastNotification);

// Platform Monitoring
router.get('/health', getPlatformHealth);
router.get('/monitoring', getPlatformHealth); // Alias endpoint

// Recent activity feed
router.get('/recent-activity', getRecentActivity);

// Transaction management
router.get('/transactions', getTransactions);

// Withdrawal management
router.get('/withdrawals', getWithdrawals);
router.get('/withdrawals/pending', getPendingWithdrawals);
router.put('/withdrawals/:withdrawalId/approve', approveWithdrawal);
router.put('/withdrawals/:withdrawalId/reject', rejectWithdrawal);

export default router;
