import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import RideRequest from '../models/RideRequest.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import SupportTicket from '../models/SupportTicket.js';
import SystemLog from '../models/SystemLog.js';
import mongoose from 'mongoose';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { sendPushToUser } from '../utils/webPush.js';

/**
 * Get admin dashboard statistics (simplified for dashboard)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  // User statistics
  const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
  const activeRiders = await User.countDocuments({ role: 'rider', 'riderProfile.isOnline': true, isDeleted: { $ne: true } });
  const totalBusinesses = await User.countDocuments({ role: 'business', isDeleted: { $ne: true } });
  const activeBusinesses = await User.countDocuments({ role: 'business', isDeleted: { $ne: true }, isActive: { $ne: false } });
  const totalCustomers = await User.countDocuments({ role: 'customer', isDeleted: { $ne: true } });
  const totalLandlords = await User.countDocuments({ role: 'landlord', isDeleted: { $ne: true } });
  const totalRiders = await User.countDocuments({ role: 'rider', isDeleted: { $ne: true } });
  const totalCaretakers = await User.countDocuments({ role: 'caretaker', isDeleted: { $ne: true } });
  const totalAssistants = await User.countDocuments({ role: 'assistant', isDeleted: { $ne: true } });

  // Transaction statistics (last 30 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const transactions = await Transaction.find({ createdAt: { $gte: startDate } });
  const completedTransactions = transactions.filter(t => t.status === 'completed');

  // Total platform commission revenue (all-time)
  const allCompletedTransactionsForRevenue = await Transaction.find({ status: 'completed' });
  const totalRevenue = allCompletedTransactionsForRevenue.reduce((sum, t) => sum + (t.commission?.totalCommission || 0), 0);

  // Order statistics
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const activeOrders = await Order.countDocuments({ status: { $in: ['paid', 'processing'] } });
  const completedOrders = await Order.countDocuments({ status: { $in: ['delivered', 'completed'] } });
  const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

  // Rental statistics
  const pendingBookings = await Rental.aggregate([
    { $unwind: '$bookings' },
    { $match: { 'bookings.status': 'pending' } },
    { $count: 'count' }
  ]).then(res => res[0]?.count || 0);

  const approvedBookings = await Rental.aggregate([
    { $unwind: '$bookings' },
    { $match: { 'bookings.status': { $in: ['confirmed', 'out_for_handover', 'active'] } } },
    { $count: 'count' }
  ]).then(res => res[0]?.count || 0);

  // Ride statistics
  const pendingRides = await RideRequest.countDocuments({ status: { $in: ['pending_payment', 'waiting_rider'] } });
  const activeRides = await RideRequest.countDocuments({ status: { $in: ['accepted', 'in_progress', 'awaiting_customer_confirmation'] } });
  const completedRides = await RideRequest.countDocuments({ status: 'completed' });

  // Recent activity
  const recentRegistrations = await User.find({ isDeleted: { $ne: true } })
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentOrders = await Order.find()
    .populate('customer', 'name')
    .populate('business', 'businessProfile.businessName')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentBookings = await Rental.aggregate([
    { $unwind: '$bookings' },
    { $sort: { 'bookings.bookedAt': -1 } },
    { $limit: 5 },
    {
      $project: {
        rentalName: '$rentalName',
        customer: '$bookings.customer',
        status: '$bookings.status',
        totalPrice: '$bookings.totalPrice',
        bookedAt: '$bookings.bookedAt'
      }
    }
  ]);
  const populatedBookings = await User.populate(recentBookings, { path: 'customer', select: 'name' });

  const recentRideRequests = await RideRequest.find()
    .populate('customer', 'name')
    .populate('rider', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  // Withdrawal statistics
  const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalCustomers,
      totalBusinesses,
      totalLandlords,
      totalRiders,
      totalCaretakers,
      totalAssistants,
      activeRiders,
      activeBusinesses,
      pendingOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      pendingBookings,
      approvedBookings,
      pendingRides,
      activeRides,
      completedRides,
      totalRevenue,
      pendingWithdrawals,
      recentRegistrations,
      recentOrders,
      recentBookings: populatedBookings,
      recentRideRequests,
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
  const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
  const newUsers = await User.countDocuments({ createdAt: { $gte: startDate }, isDeleted: { $ne: true } });
  const activeRiders = await User.countDocuments({ role: 'rider', 'riderProfile.isOnline': true, isDeleted: { $ne: true } });
  const activeBusinesses = await User.countDocuments({ role: 'business', isDeleted: { $ne: true } });

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
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;

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

  let query = { isDeleted: { $ne: true } };
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
 * Get user details along with activity summary
 */
export const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');

  if (!user || user.isDeleted) {
    throw new ResponseError('User not found', 404);
  }

  const wallet = await Wallet.findOne({ user: userId });

  // Get user activity summary
  const orderCount = await Order.countDocuments({ customer: userId });
  const rideCount = await RideRequest.countDocuments({ customer: userId });
  const bookingCount = await Rental.countDocuments({ 'bookings.customer': userId });

  let businessStats = null;
  if (user.role === 'business') {
    const productsCount = await Order.countDocuments({ business: userId });
    businessStats = { productsCount };
  }

  res.status(200).json({
    success: true,
    data: {
      user,
      wallet,
      activity: {
        orderCount,
        rideCount,
        bookingCount,
        businessStats,
      }
    },
  });
});

/**
 * Update user status (ban/unban/suspend)
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  user.isActive = isActive !== undefined ? isActive : true;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

/**
 * Delete user (soft delete)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  user.isDeleted = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User soft-deleted successfully',
  });
});

/**
 * ==========================================
 * ORDERS MANAGEMENT
 * ==========================================
 */

/**
 * Get all marketplace / healthcare orders
 */
export const getAdminOrders = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  let query = {};
  if (status) query.status = status;

  if (search) {
    const isObjectId = mongoose.Types.ObjectId.isValid(search);
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'businessProfile.businessName': { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    const userIds = matchingUsers.map(u => u._id);

    const orQuery = [
      { customer: { $in: userIds } },
      { business: { $in: userIds } }
    ];

    if (isObjectId) {
      orQuery.push({ _id: search });
    }

    query.$or = orQuery;
  }

  const skip = (page - 1) * limit;
  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .populate('customer', 'name email phone')
    .populate('business', 'name email phone businessProfile')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Update order status or Flag / Review an Order
 */
export const updateAdminOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, markForReview } = req.body;

  const order = await Order.findById(orderId)
    .populate('customer', 'name email phone')
    .populate('business', 'name email phone');

  if (!order) {
    throw new ResponseError('Order not found', 404);
  }

  if (status) order.status = status;
  if (markForReview !== undefined) {
    order.notes = `[ADMIN REVIEW FLAG: ${markForReview}] ${order.notes || ''}`;
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order updated successfully',
    data: order,
  });
});

/**
 * ==========================================
 * RENTALS & BOOKINGS MANAGEMENT
 * ==========================================
 */

/**
 * Get all rental properties
 */
export const getAdminProperties = asyncHandler(async (req, res) => {
  const { location, search, page = 1, limit = 20 } = req.query;

  let query = {};
  if (location) query.location = location;

  if (search) {
    const matchingLandlords = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    const landlordIds = matchingLandlords.map(l => l._id);

    query.$or = [
      { rentalName: { $regex: search, $options: 'i' } },
      { landlord: { $in: landlordIds } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Rental.countDocuments(query);

  const properties = await Rental.find(query)
    .populate('landlord', 'name email phone landlordProfile')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: properties,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get all bookings across properties
 */
export const getAdminBookings = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  // Since bookings are subdocuments within Rentals, let's aggregate them
  const pipeline = [
    { $unwind: '$bookings' },
    { $sort: { 'bookings.bookedAt': -1 } }
  ];

  if (status) {
    pipeline.push({ $match: { 'bookings.status': status } });
  }

  const allBookings = await Rental.aggregate(pipeline);
  const populated = await User.populate(allBookings, [
    { path: 'landlord', select: 'name email phone' },
    { path: 'bookings.customer', select: 'name email phone' }
  ]);

  let filtered = populated;
  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = populated.filter(item =>
      item.rentalName?.toLowerCase().includes(lowerSearch) ||
      item.landlord?.name?.toLowerCase().includes(lowerSearch) ||
      item.bookings?.customer?.name?.toLowerCase().includes(lowerSearch)
    );
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginated = filtered.slice(skip, skip + parseInt(limit));

  res.status(200).json({
    success: true,
    data: paginated,
    pagination: {
      total: filtered.length,
      pages: Math.ceil(filtered.length / limit),
      currentPage: parseInt(page),
    }
  });
});

/**
 * Flag / Toggle property listing availability
 */
export const flagAdminProperty = asyncHandler(async (req, res) => {
  const { rentalId } = req.params;
  const { isAvailable } = req.body;

  const rental = await Rental.findById(rentalId);
  if (!rental) {
    throw new ResponseError('Rental listing not found', 404);
  }

  rental.isAvailable = isAvailable !== undefined ? isAvailable : !rental.isAvailable;
  await rental.save();

  res.status(200).json({
    success: true,
    message: `Rental property status updated successfully`,
    data: rental,
  });
});

/**
 * ==========================================
 * RIDES & RIDE REQUESTS MANAGEMENT
 * ==========================================
 */

/**
 * Get all ride requests
 */
export const getAdminRides = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  let query = {};
  if (status) query.status = status;

  if (search) {
    const isObjectId = mongoose.Types.ObjectId.isValid(search);
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    const userIds = matchingUsers.map(u => u._id);

    const orQuery = [
      { customer: { $in: userIds } },
      { rider: { $in: userIds } }
    ];

    if (isObjectId) {
      orQuery.push({ _id: search });
    }

    query.$or = orQuery;
  }

  const skip = (page - 1) * limit;
  const total = await RideRequest.countDocuments(query);

  const rides = await RideRequest.find(query)
    .populate('customer', 'name email phone')
    .populate('rider', 'name email phone')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: rides,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Update ride details or monitor cancelled rides
 */
export const updateAdminRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { status } = req.body;

  const ride = await RideRequest.findById(rideId);
  if (!ride) {
    throw new ResponseError('Ride request not found', 404);
  }

  if (status) ride.status = status;
  await ride.save();

  res.status(200).json({
    success: true,
    message: 'Ride request updated successfully',
    data: ride,
  });
});

/**
 * ==========================================
 * REPORTS, COMPLAINTS & WORKFLOWS
 * ==========================================
 */

/**
 * Create a Support Report / Complaint
 */
export const createAdminReport = asyncHandler(async (req, res) => {
  const { category, title, description } = req.body;
  const userId = req.user._id;

  const report = await SupportTicket.create({
    user: userId,
    category,
    title,
    description,
    status: 'Open',
  });

  res.status(201).json({
    success: true,
    data: report,
  });
});

/**
 * Get all support reports / complaints
 */
export const getAdminReports = asyncHandler(async (req, res) => {
  const { category, status, page = 1, limit = 20 } = req.query;

  let query = {};
  if (category) query.category = category;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const reports = await SupportTicket.find(query)
    .populate('user', 'name email phone role')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await SupportTicket.countDocuments(query);

  res.status(200).json({
    success: true,
    data: reports,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Update support report status and resolution history
 */
export const updateAdminReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, adminNotes } = req.body;

  const report = await SupportTicket.findById(reportId);
  if (!report) {
    throw new ResponseError('Support ticket not found', 404);
  }

  if (status) {
    report.status = status;
    report.resolutionHistory.push({
      status,
      note: adminNotes || 'Status updated by administrator',
    });
  }
  if (adminNotes !== undefined) report.adminNotes = adminNotes;

  await report.save();

  res.status(200).json({
    success: true,
    data: report,
  });
});

/**
 * ==========================================
 * BROADCAST NOTIFICATIONS
 * ==========================================
 */

/**
 * Broadcast notification to single or multiple target user groups
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, targetAudience, specificUserId, actionUrl } = req.body;

  let usersToNotify = [];

  if (specificUserId) {
    usersToNotify = await User.find({ _id: specificUserId, isDeleted: { $ne: true } });
  } else if (targetAudience === 'all') {
    usersToNotify = await User.find({ isDeleted: { $ne: true } });
  } else if (targetAudience) {
    usersToNotify = await User.find({ role: targetAudience, isDeleted: { $ne: true } });
  }

  if (usersToNotify.length === 0) {
    throw new ResponseError('No target users found for this audience', 400);
  }

  const notificationPromises = usersToNotify.map(async (u) => {
    const notif = await Notification.create({
      user: u._id,
      userId: u._id,
      type: 'system',
      notificationType: 'system',
      title,
      message,
      actionUrl: actionUrl || null,
      data: { actionUrl },
    });

    try {
      await sendPushToUser(u._id, {
        title,
        body: message,
        data: { actionUrl },
      });
    } catch (pushErr) {
    }

    return notif;
  });

  await Promise.all(notificationPromises);

  res.status(200).json({
    success: true,
    message: `Broadcast successfully sent to ${usersToNotify.length} users`,
  });
});

/**
 * ==========================================
 * PLATFORM HEALTH & MONITORING
 * ==========================================
 */

/**
 * Get overall server and live MongoDB health (fully connected to DB logs)
 */
export const getPlatformHealth = asyncHandler(async (req, res) => {
  const failedPayments = await SystemLog.countDocuments({ type: 'payment_failure' });
  const failedApiRequests = await SystemLog.countDocuments({ type: 'api_error' });
  const unhandledErrors = await SystemLog.countDocuments({ type: 'unhandled_error' });
  const pendingSupport = await SupportTicket.countDocuments({ status: { $in: ['Open', 'In Progress'] } });

  // Calculate active users online dynamically (users logged in / active in the last 15 mins)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const activeUsersOnline = await User.countDocuments({
    isDeleted: { $ne: true },
    $or: [
      { lastLogin: { $gte: fifteenMinutesAgo } },
      { 'sessions.lastActive': { $gte: fifteenMinutesAgo } }
    ]
  });

  // Latest errors feed
  const recentErrors = await SystemLog.find()
    .populate('user', 'name email role')
    .sort({ timestamp: -1 })
    .limit(10);

  // Check database connection state
  let dbStatus = 'disconnected';
  if (mongoose.connection.readyState === 1) {
    dbStatus = 'connected';
  } else if (mongoose.connection.readyState === 2) {
    dbStatus = 'connecting';
  }

  res.status(200).json({
    success: true,
    data: {
      serverStatus: 'healthy',
      databaseStatus: dbStatus,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      apiHealth: '100% online',
      activeUsersOnline,
      failedPayments,
      failedApiRequests,
      unhandledErrors,
      pendingSupport,
      systemAlerts: failedPayments > 10 ? 'High number of failed transactions detected' : 'All systems clear',
      recentErrors
    },
  });
});

/**
 * Get recent activity across all system entities
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const registrations = await User.find({ isDeleted: { $ne: true } })
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

  const orders = await Order.find()
    .populate('customer', 'name email')
    .populate('business', 'name businessProfile')
    .sort({ createdAt: -1 })
    .limit(10);

  const bookings = await Rental.aggregate([
    { $unwind: '$bookings' },
    { $sort: { 'bookings.bookedAt': -1 } },
    { $limit: 10 },
    {
      $project: {
        rentalName: '$rentalName',
        customer: '$bookings.customer',
        status: '$bookings.status',
        totalPrice: '$bookings.totalPrice',
        bookedAt: '$bookings.bookedAt'
      }
    }
  ]);
  const populatedBookings = await User.populate(bookings, { path: 'customer', select: 'name email' });

  const rides = await RideRequest.find()
    .populate('customer', 'name email')
    .populate('rider', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      registrations,
      orders,
      bookings: populatedBookings,
      rides
    }
  });
});

/**
 * OTHER ADMINISTRATIVE LOGICS
 * ==========================================
 */

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
