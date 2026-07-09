import Notification from '../models/Notification.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

/**
 * Get all notifications for current user
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, type, read } = req.query;

  let query = { user: userId };
  if (type) query.type = type;
  if (read !== undefined) query.read = read === 'true';

  // Auto-clear read notifications older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Notification.deleteMany({
    user: userId,
    read: true,
    createdAt: { $lt: twentyFourHoursAgo }
  });

  const skip = (page - 1) * limit;

  const notifications = await Notification.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get unread notification count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const count = await Notification.countDocuments({ user: userId, read: false });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

/**
 * Mark notification as read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new ResponseError('Notification not found', 404);
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});

/**
 * Delete notification
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    throw new ResponseError('Notification not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
  });
});

/**
 * Delete all notifications (clear all)
 */
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.deleteMany({ user: userId });

  res.status(200).json({
    success: true,
    message: 'All notifications deleted',
  });
});

/**
 * Clean up old read notifications (called by scheduled job)
 * Deletes notifications that are read and older than 24 hours
 */
export const cleanupOldNotifications = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: twentyFourHoursAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`[CLEANUP] Deleted ${result.deletedCount} old read notifications`);
    }
  } catch (error) {
    console.error('[CLEANUP] Error deleting old notifications:', error);
  }
};

/**
 * Create notification (internal use - called by other controllers)
 * Note: For socket.io emission, pass req object as the last parameter
 * @param {string} userId - The user ID to receive the notification
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Additional data
 * @param {string} actionUrl - URL for action button
 * @param {string} navigationTarget - Navigation target path
 * @param {object} req - Request object (for socket.io)
 * @param {string} userRole - User role for room targeting ('customer', 'rider', 'business', 'landlord')
 */
export const createNotification = async (userId, type, title, message, data = {}, actionUrl = null, navigationTarget = null, req = null, userRole = 'customer') => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
      actionUrl,
      navigationTarget,
    });

    // Emit real-time notification via Socket.IO if available
    // Use req.app.get('io') if req is provided, otherwise try global.io
    const io = req ? req.app.get('io') : global.io;
    
    // Use role-specific room targeting for proper notification delivery
    let targetRoom;
    switch (userRole) {
      case 'rider':
        targetRoom = `rider_${userId}`;
        break;
      case 'business':
        targetRoom = `business_${userId}`;
        break;
      case 'landlord':
        targetRoom = `landlord_${userId}`;
        break;
      case 'customer':
      default:
        targetRoom = `user_${userId}`;
        break;
    }

    if (io) {
      io.to(targetRoom).emit('new_notification', notification);
      console.log('[NOTIFICATION] Emitted to room:', targetRoom, 'for user:', userId, 'role:', userRole);
    }

    return notification;
  } catch (error) {
    console.error('[Notification Failed]', error);
    console.error('[Notification Failed Details]', {
      userId,
      type,
      title,
      message: message.substring(0, 100),
      error: error.message
    });
    // Return null instead of throwing to prevent breaking business logic
    return null;
  }
};

/**
 * Create notification for order updates
 * Uses exact messages as specified in requirements
 */
export const createOrderNotification = async (userId, order, status, userRole = 'customer', req = null) => {
  const orderIdStr = String(order._id);

  // Determine notification type and title based on status
  let notificationType, title, message;

  if (status === 'pending') {
    notificationType = 'order';
    title = 'Order Placed';
    message = `Your order #${orderIdStr.slice(-6).toUpperCase()} has been placed successfully.`;
  } else if (status === 'new_order') {
    // Special notification for business when they receive a new order
    notificationType = 'new_order';
    title = 'New Order';
    message = 'New order received from customer.';
  } else if (status === 'order_accepted') {
    notificationType = 'order_accepted';
    title = 'Order Accepted';
    message = `Your order has been accepted. Estimated delivery time: ${order.estimatedDeliveryTime || 'pending'}.`;
  } else if (status === 'order_cancelled') {
    notificationType = 'order_update';
    title = 'Order Cancelled';
    message = `Your order #${orderIdStr.slice(-6).toUpperCase()} has been cancelled. Reason: ${order.cancellationReason || 'N/A'}.`;
  } else if (status === 'order_delivered' || status === 'delivered') {
    notificationType = 'order_delivered';
    title = 'Order Delivered';
    message = 'Your order has been marked as delivered.\nPlease confirm delivery.';
  } else if (status === 'delivery_confirmed') {
    notificationType = 'delivery_confirmed';
    title = 'Delivery Confirmed';
    message = 'Customer confirmed delivery.\nEscrow funds released.';
  } else if (status === 'delivery_confirmed_success') {
    notificationType = 'delivery_confirmed';
    title = 'Delivery Confirmed';
    message = 'You confirmed delivery successfully.';
  } else if (status === 'processing') {
    notificationType = 'order_update';
    title = 'Order Processing';
    message = `Your order #${orderIdStr.slice(-6).toUpperCase()} is being processed.`;
  } else if (status === 'paid') {
    notificationType = 'order_payment_confirmed';
    title = 'Payment Confirmed';
    message = `Your payment for order #${orderIdStr.slice(-6).toUpperCase()} has been confirmed.`;
  } else if (status === 'cancelled') {
    notificationType = 'order_update';
    title = 'Order Cancelled';
    message = `Your order #${orderIdStr.slice(-6).toUpperCase()} has been cancelled.`;
  } else {
    notificationType = 'order_update';
    title = 'Order Updated';
    message = `Your order #${orderIdStr.slice(-6).toUpperCase()} status: ${status}`;
  }

  // Determine navigation target based on user role
  let navigationTarget;
  if (userRole === 'business') {
    navigationTarget = '/business/orders';
  } else {
    navigationTarget = '/customer/orders';
  }

  return createNotification(
    userId,
    notificationType,
    title,
    message,
    { orderId: orderIdStr, status },
    `/orders/${orderIdStr}`,
    navigationTarget,
    req
  );
};

/**
 * Create notification for payment
 */
export const createPaymentNotification = async (userId, transaction, navigationTarget = null, req = null) => {
  return createNotification(
    userId,
    'payment',
    'Payment Successful',
    `Your payment of KSh ${transaction.amount?.totalAmount || 0} has been processed`,
    { transactionId: transaction._id },
    '/transactions',
    navigationTarget,
    req
  );
};

/**
 * Create notification for ride
 * @param {string} customMessage - Optional custom message (e.g., for decline reasons)
 */
export const createRideNotification = async (userId, ride, status, userRole = 'customer', req = null, customMessage = null) => {
  const statusMessages = {
    pending_payment: 'Payment Pending',
    waiting_rider: 'Waiting for Rider',
    accepted: 'Ride Accepted',
    started: 'Ride Started',
    in_progress: 'Ride In Progress',
    awaiting_customer_confirmation: 'Awaiting Arrival Confirmation',
    completed: 'Ride Completed',
    declined: 'Ride Declined',
    cancelled: 'Ride Cancelled',
  };

  // Determine navigation target based on user role
  let navigationTarget;
  if (userRole === 'rider') {
    navigationTarget = '/rider/rides';
  } else {
    navigationTarget = '/customer/rides';
  }

  // Use custom message if provided, otherwise use default
  const message = customMessage || `Your ride ${status}: ${ride.pickupLocation?.address || 'Pickup'} → ${ride.dropoffLocation?.address || 'Dropoff'}`;

  return createNotification(
    userId,
    `ride_${status}`,
    statusMessages[status] || 'Ride Update',
    message,
    { rideId: ride._id, status },
    `/rides/${ride._id}`,
    navigationTarget,
    req
  );
};

/**
 * Create notification for booking
 */
export const createBookingNotification = async (userId, booking, property, status, userRole = 'customer', req = null) => {
  // Determine navigation target based on user role
  let navigationTarget;
  if (userRole === 'landlord') {
    navigationTarget = '/landlord/bookings';
  } else {
    navigationTarget = '/customer/rentals';
  }

  return createNotification(
    userId,
    status === 'pending' ? 'booking' : 'booking_confirmed',
    status === 'pending' ? 'Booking Created' : 'Booking Confirmed',
    `Your booking at ${property?.title || 'Property'} has been ${status}`,
    { bookingId: booking._id, propertyId: property?._id, status },
    `/rentals/${property?._id}`,
    navigationTarget,
    req
  );
};

/**
 * Create notification for rental booking
 */
export const createRentalNotification = async (userId, rental, booking, eventType, userRole = 'customer', req = null) => {
  const eventMessages = {
    booking_pending: 'Rental Booking Requested',
    new_booking: 'New Booking Request',
    booking_confirmed: 'Booking Accepted',
    booking_cancelled: 'Booking Declined',
    move_in_date_set: 'Move-In Date Set',
    move_in_confirmed: 'Move-In Confirmed',
    move_in_confirmed_success: 'Move-In Confirmed Successfully',
  };

  const eventDetails = {
    booking_pending: `Your booking for ${rental?.rentalName || 'a rental'} is pending landlord acceptance.`,
    new_booking: `You have a new booking request for ${rental?.rentalName || 'a rental'}. Please accept or decline.`,
    booking_confirmed: `Your booking for ${rental?.rentalName || 'a rental'} has been accepted. Please select your move-in date.`,
    booking_cancelled: `Your booking for ${rental?.rentalName || 'a rental'} was declined. Reason: ${booking?.declineReason || 'No reason provided'}`,
    move_in_date_set: `Your move-in date for ${rental?.rentalName || 'a rental'} has been set. Please confirm when you have moved in.`,
    move_in_confirmed: `Customer has confirmed move-in for ${rental?.rentalName || 'a rental'}. Funds have been released.`,
    move_in_confirmed_success: `You have confirmed move-in for ${rental?.rentalName || 'a rental'}. Payment has been released to the landlord.`,
  };

  const messageType = eventType === 'new_booking' ? 'booking_request' : 'rental_booking';

  // Determine navigation target based on user role
  let navigationTarget;
  if (userRole === 'landlord') {
    navigationTarget = '/landlord/bookings';
  } else {
    navigationTarget = '/customer/bookings';
  }

  return createNotification(
    userId,
    messageType,
    eventMessages[eventType] || 'Rental Booking Update',
    eventDetails[eventType] || `${rental?.rentalName || 'Rental'}: ${eventType}`,
    { rentalId: rental?._id, bookingId: booking?._id, eventType, status: booking?.status },
    `/rentals/${rental?._id}`,
    navigationTarget,
    req
  );
};
