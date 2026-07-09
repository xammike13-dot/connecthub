import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import RideRequest from '../models/RideRequest.js';
import Wallet from '../models/Wallet.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

/**
 * Get admin dashboard statistics (simplified for dashboard)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  // User statistics
  const totalUsers = await User.countDocuments();
  const activeRiders = await User.countDocuments({ role: 'rider', 'riderProfile.isOnline': true });
  const activeBusinesses = await User.countDocuments({ role: 'business' });
  const totalCustomers = await User.countDocuments({ role: 'customer' });

  // Transaction statistics (last 30 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const transactions = await Transaction.find({ createdAt: { $gte: startDate } });
  const completedTransactions = transactions.filter(t => t.status === 'completed');
  const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.commission?.totalCommission || 0), 0);

  // Order statistics
  const orders = await Order.countDocuments();
  const completedOrders = await Order.countDocuments({ status: 'delivered' });

  // Withdrawal statistics
  const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeRiders,
      activeBusinesses,
      totalCustomers,
      totalOrders: orders,
      completedOrders,
      totalRevenue,
      pendingWithdrawals,
      transactionCount: transactions.length,
      successRate: transactions.length > 0 
        ? ((completedTransactions.length / transactions.length) * 100).toFixed(2) 
        : 0,
    },
  });
});

/**
 * Get platform analytics (detailed)
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const { period = 30 } = req.query; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // User statistics
  const totalUsers = await User.countDocuments();
  const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
  const activeRiders = await User.countDocuments({ role: 'rider', 'riderProfile.isOnline': true });
  const activeBusinesses = await User.countDocuments({ role: 'business' });

  // Transaction statistics
  const transactions = await Transaction.find({ createdAt: { $gte: startDate } });
  const totalTransactions = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount?.totalAmount || 0), 0);
  const totalCommission = transactions.reduce((sum, t) => sum + (t.commission?.totalCommission || 0), 0);

  // Payment success rate
  const successfulTransactions = transactions.filter(t => t.status === 'completed').length;
  const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

  // Order statistics
  const orders = await Order.find({ createdAt: { $gte: startDate } });
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  // Withdrawal statistics
  const withdrawals = await Withdrawal.find({ createdAt: { $gte: startDate } });
  const totalWithdrawals = withdrawals.filter(w => w.status === 'completed').length;
  const totalWithdrawnAmount = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + w.netAmount, 0);

  // Revenue breakdown by type
  const revenueByType = {};
  transactions.forEach(t => {
    if (!revenueByType[t.type]) {
      revenueByType[t.type] = 0;
    }
    revenueByType[t.type] += t.commission?.totalCommission || 0;
  });

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        newInPeriod: newUsers,
        activeRiders,
        activeBusinesses,
      },
      transactions: {
        total: totalTransactions,
        completed: successfulTransactions,
        successRate: parseFloat(successRate.toFixed(2)),
        totalRevenue,
        totalCommission,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
      },
      withdrawals: {
        total: totalWithdrawals,
        totalAmount: totalWithdrawnAmount,
      },
      revenueByType,
      period,
    },
  });
});

/**
 * Get all users for management
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  let query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('-password')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get user details
 */
export const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  const wallet = await Wallet.findOne({ user: userId });

  res.status(200).json({
    success: true,
    data: {
      user,
      wallet,
    },
  });
});

/**
 * Update user status (ban/unban)
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive, banReason } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      isActive: isActive !== undefined ? isActive : true,
    },
    { new: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    message: `User ${isActive ? 'activated' : 'banned'} successfully`,
    data: user,
  });
});

/**
 * Get all transactions
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;

  let query = {};
  if (status) query.status = status;
  if (type) query.type = type;

  const skip = (page - 1) * limit;

  const transactions = await Transaction.find(query)
    .populate('customer', 'name email phone')
    .populate('provider', 'name email phone')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Transaction.countDocuments(query);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get all withdrawals
 */
export const getWithdrawals = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  let query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const withdrawals = await Withdrawal.find(query)
    .populate('user', 'name email phone')
    .populate('wallet')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Withdrawal.countDocuments(query);

  res.status(200).json({
    success: true,
    data: withdrawals,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get pending withdrawals
 */
export const getPendingWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ status: 'pending' })
    .populate('user', 'name email phone')
    .populate('wallet')
    .sort('createdAt');

  res.status(200).json({
    success: true,
    data: withdrawals,
  });
});

/**
 * Approve withdrawal
 */
export const approveWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;
  const adminId = req.user._id;

  const withdrawal = await Withdrawal.findById(withdrawalId)
    .populate('user')
    .populate('wallet');

  if (!withdrawal) {
    throw new ResponseError('Withdrawal not found', 404);
  }

  if (withdrawal.status !== 'pending') {
    throw new ResponseError('Withdrawal is not pending', 400);
  }

  withdrawal.status = 'processing';
  withdrawal.processedBy = adminId;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  res.status(200).json({
    success: true,
    message: 'Withdrawal marked for processing',
    data: withdrawal,
  });
});

/**
 * Reject withdrawal
 */
export const rejectWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;

  const withdrawal = await Withdrawal.findById(withdrawalId)
    .populate('user')
    .populate('wallet');

  if (!withdrawal) {
    throw new ResponseError('Withdrawal not found', 404);
  }

  if (withdrawal.status !== 'pending') {
    throw new ResponseError('Withdrawal is not pending', 400);
  }

  // Refund to wallet
  const wallet = await Wallet.findById(withdrawal.wallet);
  wallet.balance += withdrawal.amount;
  await wallet.save();

  withdrawal.status = 'failed';
  withdrawal.rejectionReason = reason || 'Rejected by admin';
  withdrawal.processedBy = adminId;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  res.status(200).json({
    success: true,
    message: 'Withdrawal rejected and funds refunded',
    data: withdrawal,
  });
});

/**
 * Get daily revenue report
 */
export const getDailyRevenue = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const revenue = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
        totalRevenue: {
          $sum: '$commission.totalCommission',
        },
        totalTransactions: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: revenue,
  });
});

/**
 * Get disputes or refunds report
 */
export const getDisputeReport = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const disputes = await Transaction.find({
    status: { $in: ['refunded', 'failed'] },
  })
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Transaction.countDocuments({
    status: { $in: ['refunded', 'failed'] },
  });

  res.status(200).json({
    success: true,
    data: disputes,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});
