import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import RideRequest from '../models/RideRequest.js';
import Wallet from '../models/Wallet.js';
import Wishlist from '../models/Wishlist.js';
import Notification from '../models/Notification.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

/**
 * Get customer dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  // Get customer orders
  const orders = await Order.find({ customer: customerId });
  const totalOrders = orders.length;

  // Get customer rentals/bookings
  // Since rentals are stored with embedded bookings, we need to find properties where user has bookings
  const rentalsWithBookings = await Rental.find({ 'bookings.customer': customerId });
  let totalRentals = 0;
  rentalsWithBookings.forEach(rental => {
    const userBookings = rental.bookings.filter(b => b.customer.toString() === customerId.toString());
    totalRentals += userBookings.length;
  });

  // Get customer rides
  const rides = await RideRequest.find({ customer: customerId });
  const totalRides = rides.length;

  // Calculate healthcare orders (orders with type 'healthcare')
  const healthcareOrders = orders.filter(o => o.orderType === 'healthcare').length;

  // Calculate total spent
  const totalSpent = orders
    .filter(o => o.status === 'delivered' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  // Get Wishlist count
  const wishlist = await Wishlist.findOne({ customer: customerId });
  const wishlistCount = wishlist ? (wishlist.products?.length || 0) + (wishlist.rentals?.length || 0) : 0;

  // Get customer unread notifications count
  const unreadNotificationsCount = await Notification.countDocuments({ user: customerId, read: false });

  // Get recent orders (last 5)
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(order => ({
      _id: order._id,
      items: order.items,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      status: order.status,
      orderType: order.orderType,
      createdAt: order.createdAt,
    }));

  res.status(200).json({
    success: true,
    data: {
      orders: totalOrders,
      rentals: totalRentals,
      rides: totalRides,
      healthcareOrders,
      totalSpent,
      wishlistCount,
      unreadNotificationsCount,
      recentOrders,
    },
  });
});

/**
 * Get customer's orders
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { status, orderType, page = 1, limit = 10 } = req.query;

  let query = { customer: customerId };
  if (status) query.status = status;
  if (orderType) query.orderType = orderType;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('business', 'name email phone')
    .populate('items.product', 'name price images')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(query);

  // Debug: Log order status and paymentStatus for each order
  console.log('[CUSTOMER ORDERS API]', orders.map((order) => ({
    orderId: order._id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
  })));

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
 * Get customer's bookings (rentals)
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  // Find all rentals where this customer has bookings
  const rentals = await Rental.find({ 'bookings.customer': customerId })
    .populate('landlord', 'name phone email');
  
  // Extract bookings for this customer
  let allBookings = [];
  rentals.forEach(rental => {
    const userBookings = rental.bookings.filter(
      b => b.customer.toString() === customerId.toString()
    );
    userBookings.forEach(booking => {
      allBookings.push({
        _id: booking._id,
        rental: {
          _id: rental._id,
          rentalName: rental.rentalName,
          rentalType: rental.rentalType,
          location: rental.location,
          images: rental.images,
          landlord: rental.landlord,
        },
        booking: {
          _id: booking._id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalPrice: booking.totalPrice,
          bookedAt: booking.bookedAt,
          moveInDate: booking.moveInDate,
          moveInConfirmed: booking.moveInConfirmed,
          escrowStatus: booking.escrowStatus,
        },
      });
    });
  });

  // Filter by status if provided
  if (status) {
    allBookings = allBookings.filter(b => b.status === status);
  }

  // Sort by bookedAt descending
  allBookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

  // Paginate
  const skip = (page - 1) * limit;
  const paginatedBookings = allBookings.slice(skip, skip + parseInt(limit));

  res.status(200).json({
    success: true,
    data: paginatedBookings,
    pagination: {
      total: allBookings.length,
      pages: Math.ceil(allBookings.length / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get customer's rides
 */
export const getMyRides = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  let query = { customer: customerId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const rides = await RideRequest.find(query)
    .populate('rider', 'name phone')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await RideRequest.countDocuments(query);

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
