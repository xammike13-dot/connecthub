import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { getDashboardWalletData, getWalletPageData } from '../services/walletCalculationService.js';
import { getActiveBusinessId } from './assistantController.js';

/**
 * Get business dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }

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

  // Determine if caller is assistant
  const isAssistant = req.user.role === 'assistant';

  // Calculate total revenue from delivered/completed orders (zero for assistant)
  const totalRevenue = isAssistant ? 0 : orders
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

  // Retrieve wallet statistics (mocked/zeroed out for assistant)
  let availableBalance = 0;
  let pendingBalance = 0;
  let totalEarnings = 0;
  let totalWithdrawn = 0;

  if (!isAssistant) {
    // Get wallet data from centralized service
    const walletData = await getDashboardWalletData(businessId, 'business');
    availableBalance = walletData.availableBalance;
    pendingBalance = walletData.pendingBalance;
    totalEarnings = walletData.totalEarnings;
    totalWithdrawn = walletData.totalWithdrawn;
  }

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
 * Get unique customers who have ordered from this business, with aggregated statistics.
 * Supports searching by customer name, email, or phone.
 */
export const getCustomers = asyncHandler(async (req, res) => {
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }
  const { search, page = 1, limit = 10 } = req.query;

  // First, find all orders for this business
  const query = { business: businessId };
  const allOrders = await Order.find(query)
    .populate('customer', 'name email phone')
    .sort('-createdAt');

  // Map orders to unique customers with aggregated metrics
  const customerMap = {};

  allOrders.forEach((order) => {
    const cust = order.customer;
    if (!cust) return;

    const customerId = cust._id ? cust._id.toString() : 'unknown';
    const orderAmount = order.finalAmount || order.totalAmount || 0;

    if (!customerMap[customerId]) {
      customerMap[customerId] = {
        id: customerId,
        name: cust.name || 'Anonymous Customer',
        email: cust.email || 'N/A',
        phone: order.deliveryAddress?.phone || cust.phone || 'N/A',
        address: order.deliveryAddress?.address || 'N/A',
        orderCount: 1,
        totalSpent: orderAmount,
        lastOrderDate: new Date(order.createdAt),
        status: order.status,
      };
    } else {
      customerMap[customerId].orderCount += 1;
      customerMap[customerId].totalSpent += orderAmount;
      const currentOrderDate = new Date(order.createdAt);
      if (currentOrderDate > customerMap[customerId].lastOrderDate) {
        customerMap[customerId].lastOrderDate = currentOrderDate;
        customerMap[customerId].status = order.status;
      }
    }
  });

  let customersList = Object.values(customerMap);

  // Apply in-memory search filter if search query is provided
  if (search && search.trim() !== '') {
    const searchLower = search.toLowerCase();
    customersList = customersList.filter(
      (cust) =>
        cust.name.toLowerCase().includes(searchLower) ||
        cust.email.toLowerCase().includes(searchLower) ||
        cust.phone.toLowerCase().includes(searchLower) ||
        cust.address.toLowerCase().includes(searchLower)
    );
  }

  // High-level statistics across all matching customers (before pagination)
  const stats = {
    totalCustomers: customersList.length,
    repeatCustomers: customersList.filter((c) => c.orderCount > 1).length,
    totalSales: customersList.reduce((sum, c) => sum + c.totalSpent, 0),
    averageSpending: customersList.length > 0 ? (customersList.reduce((sum, c) => sum + c.totalSpent, 0) / customersList.length) : 0,
  };

  // Pagination
  const total = customersList.length;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginatedCustomers = customersList.slice(skip, skip + parseInt(limit));

  res.status(200).json({
    success: true,
    data: paginatedCustomers,
    stats,
    pagination: {
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get business profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }

  const user = await User.findById(businessId).select('-password');

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  const isAssistant = req.user.role === 'assistant';

  // Strictly block wallet details for assistant
  let wallet = null;
  if (!isAssistant) {
    // Get or create wallet
    wallet = await Wallet.findOne({ user: businessId });
    if (!wallet) {
      wallet = await Wallet.create({ user: businessId });
    }
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
      wallet: wallet || { availableBalance: 0, pendingBalance: 0, totalEarnings: 0, totalWithdrawn: 0 },
    },
  });
});

/**
 * Update business profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }
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
  if (req.user.role === 'assistant') {
    throw new ResponseError('Assistants are not authorized to view wallet details.', 403);
  }
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
  if (req.user.role === 'assistant') {
    throw new ResponseError('Assistants are not authorized to view withdrawal history.', 403);
  }
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
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }
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
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }
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
  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }
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
