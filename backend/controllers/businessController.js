import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { getDashboardWalletData, getWalletPageData } from '../services/walletCalculationService.js';

/**
 * Get business dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const businessId = req.user._id;

  // Get all products for this business
  const products = await Product.find({ business: businessId });
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.isActive && p.stock > 0).length;
  const outOfStockProducts = products.filter(p => p.stock <= 0).length;

  // Get orders for this business
  const orders = await Order.find({ business: businessId });
  const totalOrders = orders.length;

  // Order status counts
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  // Calculate total revenue from delivered orders
  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.status === 'delivered')
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  // Get recent orders (last 5)
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(order => ({
      _id: order._id,
      customer: order.customer,
      items: order.items.length,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      status: order.status,
      orderType: order.orderType,
      createdAt: order.createdAt,
    }));

  // Get rating from business profile
  const user = await User.findById(businessId);
  const rating = user?.businessProfile?.rating || 0;

  // Get wallet data from centralized service
  const walletData = await getDashboardWalletData(businessId, 'business');
  const availableBalance = walletData.availableBalance;
  const pendingBalance = walletData.pendingBalance;
  const totalEarnings = walletData.totalEarnings;
  const totalWithdrawn = walletData.totalWithdrawn;

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      availableBalance,
      pendingBalance,
      totalEarnings,
      totalWithdrawn,
      rating,
      recentOrders,
    },
  });
});

/**
 * Get business profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const businessId = req.user._id;

  const user = await User.findById(businessId).select('-password');

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: businessId });
  if (!wallet) {
    wallet = await Wallet.create({ user: businessId });
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        businessProfile: user.businessProfile,
        createdAt: user.createdAt,
      },
      wallet,
    },
  });
});

/**
 * Update business profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const businessId = req.user._id;
  const updates = req.body;

  console.log('[updateProfile] Received updates:', updates);

  // Fields that can be updated in businessProfile
  const allowedBusinessFields = [
    'businessName',
    'businessDescription',
    'businessAddress',
    'businessCategory',
    'businessLocation',
    'businessLogo',
  ];

  // Update user fields
  const finalUpdates = {};
  if (updates.name !== undefined) finalUpdates.name = updates.name;
  if (updates.email !== undefined) finalUpdates.email = updates.email;
  if (updates.phone !== undefined) finalUpdates.phone = updates.phone;

  // If businessLogo is provided, update root businessLogo and avatar as well
  if (updates.businessLogo !== undefined && updates.businessLogo !== null) {
    finalUpdates.businessLogo = updates.businessLogo;
    finalUpdates.avatar = updates.businessLogo;
  } else if (updates.avatar !== undefined) {
    finalUpdates.avatar = updates.avatar;
  }

  // Update business profile fields individually using dot notation to prevent overwriting existing fields like stats
  allowedBusinessFields.forEach(field => {
    if (updates[field] !== undefined) {
      finalUpdates[`businessProfile.${field}`] = updates[field];
    }
  });

  console.log('[updateProfile] finalUpdates with dot notation:', finalUpdates);

  const user = await User.findByIdAndUpdate(
    businessId,
    finalUpdates,
    { new: true, runValidators: true }
  ).select('-password');

  console.log('[updateProfile] Updated user businessLogo:', user.businessProfile?.businessLogo);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

/**
 * Get business wallet details
 */
export const getWallet = asyncHandler(async (req, res) => {
  const businessId = req.user._id;

  // Get wallet data from centralized service
  const walletData = await getWalletPageData(businessId, 'business');

  res.status(200).json({
    success: true,
    data: walletData,
  });
});

/**
 * Get withdrawal history
 */
export const getWithdrawals = asyncHandler(async (req, res) => {
  const businessId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const withdrawals = await Withdrawal.find({ user: businessId })
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Withdrawal.countDocuments({ user: businessId });

  res.status(200).json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
      },
    },
  });
});

/**
 * Get business's products
 */
export const getMyProducts = asyncHandler(async (req, res) => {
  const businessId = req.user._id;
  const { page = 1, limit = 20, category, isActive } = req.query;

  let query = { business: businessId };
  if (category) query.category = category;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get business's services (alias for getMyProducts)
 */
export const getMyServices = asyncHandler(async (req, res) => {
  const businessId = req.user._id;
  const { page = 1, limit = 20, category, isActive } = req.query;

  let query = { business: businessId };
  if (category) query.category = category;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get business's orders
 */
export const getOrders = asyncHandler(async (req, res) => {
  const businessId = req.user._id;
  const { status, orderType, page = 1, limit = 10 } = req.query;

  let query = { business: businessId };
  if (status) query.status = status;
  if (orderType) query.orderType = orderType;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('customer', 'name email phone')
    .populate('items.product', 'name price images')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(query);

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
