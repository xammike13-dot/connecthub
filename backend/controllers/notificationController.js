import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

/**
 * WhatsApp Webhook Verification
 * Meta requires verification of webhook URLs before they can receive messages
 * 
 * This endpoint handles GET requests from Meta during webhook setup:
 * - Verifies hub.mode === "subscribe"
 * - Verifies hub.verify_token matches WHATSAPP_VERIFY_TOKEN from .env
 * - Returns hub.challenge if verification succeeds
 */
export const verifyWhatsAppWebhook = asyncHandler(async (req, res) => {
  const hubMode = req.query['hub.mode'];
  const hubVerifyToken = req.query['hub.verify_token'];
  const hubChallenge = req.query['hub.challenge'];

  // Temporary enhanced logging for webhook verification (safe to remove after testing)
  console.log('[WhatsApp Webhook Verification] Requested URL:', req.originalUrl || req.url);
  console.log('[WhatsApp Webhook Verification] hub.mode:', hubMode);
  console.log('[WhatsApp Webhook Verification] hub.verify_token (provided):', hubVerifyToken);
  console.log('[WhatsApp Webhook Verification] hub.challenge (provided):', hubChallenge);

  // Check if WHATSAPP_VERIFY_TOKEN is configured
  const whatsappVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!whatsappVerifyToken) {
    console.error('[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN is not configured. Responding 403.');
    console.log('[WhatsApp Webhook Verification] Token Matched:', false);
    return res.status(403).json({ success: false });
  }

  const tokenMatched = hubVerifyToken === whatsappVerifyToken;
  console.log('[WhatsApp Webhook Verification] Token Matched:', tokenMatched);

  // Verify webhook as per Meta's requirements
  if (hubMode === 'subscribe' && tokenMatched) {
    console.log('[WhatsApp Webhook] Verification successful. Responding 200 with challenge.');
    // Echo back the hub.challenge as plain text per Meta's spec
    res.status(200).send(hubChallenge);
    return;
  }

  console.error('[WhatsApp Webhook] Verification failed', {
    modeMatches: hubMode === 'subscribe',
    tokenMatches: tokenMatched,
  });

  console.log('[WhatsApp Webhook] Responding 403');
  res.status(403).json({ success: false });
});

/**
 * WhatsApp Message Webhook Handler
 * Receives incoming messages from Meta WhatsApp API
 */
export const handleWhatsAppMessage = asyncHandler(async (req, res) => {
  console.log('[WhatsApp Webhook Message]', JSON.stringify(req.body, null, 2));

  // Meta sends all webhook events as POST requests
  // Always respond with 200 OK to acknowledge receipt
  res.status(200).json({ success: true });

  // Process the message asynchronously (don't wait for completion)
  // This prevents timeout issues with Meta's webhook
  const payload = req.body;

  // TODO: Process WhatsApp messages here
  // - Extract message content
  // - Create notifications
  // - Send replies
  // - Update chat history
});

/**
 * Get all notifications for current user
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 50, type, read } = req.query; // Increase default limit to display more

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
    { read: true, status: 'read' },
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
    { read: true, status: 'read' }
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
    // Derive fields for Feature 8 verification
    let relatedEntityId = data?.orderId || data?.bookingId || data?.rideId || data?.paymentId || data?.transactionId || data?.healthcareOrderId || data?.productId || data?.propertyId || data?.rentalId || null;
    let relatedEntityType = null;

    if (data?.orderId || data?.healthcareOrderId) {
      relatedEntityType = 'Order';
    } else if (data?.bookingId || data?.rentalId || data?.propertyId) {
      relatedEntityType = 'Rental';
    } else if (data?.rideId) {
      relatedEntityType = 'RideRequest';
    } else if (data?.transactionId || data?.paymentId) {
      relatedEntityType = 'Transaction';
    }

    let notificationType = 'general';
    if (type === 'payment' || type?.includes('payment') || type?.includes('payout')) {
      notificationType = 'payment';
    } else if (type?.startsWith('ride') || type?.includes('ride')) {
      notificationType = 'ride';
    } else if (type?.includes('booking') || type?.includes('rental') || type?.includes('rent')) {
      notificationType = 'rental';
    } else if (type?.startsWith('order') || type === 'new_order' || type?.includes('delivery')) {
      notificationType = 'order';
    } else if (type === 'system') {
      notificationType = 'system';
    }

    // Determine healthcare subtype
    if (data?.orderType === 'healthcare' || data?.healthcareOrderId || message?.toLowerCase().includes('medicine') || message?.toLowerCase().includes('healthcare')) {
      notificationType = 'healthcare';
    }

    // Allow overriding from parameters
    if (data?.notificationType) notificationType = data.notificationType;
    if (data?.relatedEntityId) relatedEntityId = data.relatedEntityId;
    if (data?.relatedEntityType) relatedEntityType = data.relatedEntityType;

    // Determine if user action is required
    let actionRequired = false;
    if (
      type === 'new_booking' ||
      type === 'booking_request' ||
      type === 'new_order' ||
      type === 'order_delivered' ||
      type === 'ride_request' ||
      type === 'ride_awaiting_customer_confirmation' ||
      data?.actionRequired === true
    ) {
      actionRequired = true;
    }

    const notification = await Notification.create({
      user: userId,
      userId,
      type,
      notificationType,
      relatedEntityId,
      relatedEntityType,
      actionRequired,
      status: 'unread',
      title,
      message,
      data,
      actionUrl,
      navigationTarget,
    });

    // Emit real-time notification via Socket.IO if available
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

    // Deliver Web Push Notification in background
    sendPushToUser(userId, {
      title,
      body: message,
      navigationTarget: navigationTarget || actionUrl,
      data: {
        ...data,
        notificationId: notification._id,
        type,
      },
    }).catch((err) => {
      console.error('[NOTIFICATION] Push service delivery failed:', err);
    });

    return notification;
  } catch (error) {
    console.error('[Notification Failed]', error);
    console.error('[Notification Failed Details]', {
      userId,
      type,
      title,
      message: typeof message === 'string' ? message.substring(0, 100) : '',
      error: error.message
    });
    return null;
  }
};

/**
 * Create payment-related notification
 */
export const createPaymentNotification = async (userId, transaction, navigationTarget = null, req = null, userRole = 'customer') => {
  const transactionId = transaction?._id || transaction?.transactionRef || 'unknown';
  const amount = transaction?.amount || transaction?.providerReceives || transaction?.customerPays || 0;
  const title = 'Payment Update';
  const message = `Your payment for transaction ${String(transactionId).slice(-6).toUpperCase()} has been updated.`;

  return createNotification(
    userId,
    'payment',
    title,
    message,
    { transactionId, amount, status: transaction?.status, relatedEntityId: transactionId, relatedEntityType: 'Transaction' },
    `/payments/${transactionId}`,
    navigationTarget,
    req,
    userRole
  );
};

/**
 * Create ride-related notification
 */
export const createRideNotification = async (userId, ride, status, userRole = 'customer', req = null, customMessage = null) => {
  const rideId = ride?._id || 'unknown';
  const rideIdSuffix = String(rideId).slice(-6).toUpperCase();

  let title = 'Ride Update';
  let message = customMessage || `Your ride ${rideIdSuffix} has been updated.`;
  let notificationType = 'ride';
  let navigationTarget = userRole === 'rider' ? '/rider/dashboard' : '/customer/rides';

  switch (status) {
    case 'waiting_rider':
      title = 'Ride Requested';
      message = customMessage || 'Your ride request has been received and is waiting for a rider.';
      break;
    case 'accepted':
      title = 'Ride Accepted';
      message = customMessage || 'A rider has accepted your ride request.';
      break;
    case 'completed':
    case 'ride_completed':
      title = 'Ride Completed';
      message = customMessage || 'Your ride has been completed.';
      break;
    case 'cancelled':
    case 'declined':
      title = 'Ride Cancelled';
      message = customMessage || 'Your ride has been cancelled.';
      break;
    case 'awaiting_customer_confirmation':
      title = 'Ride Arrived';
      message = customMessage || 'Your rider has marked you as arrived. Please confirm your arrival.';
      break;
    default:
      title = 'Ride Update';
      message = customMessage || `Your ride ${rideIdSuffix} status has been updated to ${status}.`;
      break;
  }

  return createNotification(
    userId,
    notificationType,
    title,
    message,
    { rideId, status, relatedEntityId: rideId, relatedEntityType: 'RideRequest' },
    `/rides/${rideId}`,
    navigationTarget,
    req,
    userRole
  );
};

/**
 * Create rental-related notification
 */
export const createRentalNotification = async (userId, rental, booking, status, userRole = 'customer', req = null, customMessage = null) => {
  const rentalId = rental?._id || 'unknown';
  const bookingId = booking?._id || 'unknown';
  const rentalIdSuffix = String(rentalId).slice(-6).toUpperCase();

  let title = 'Rental Update';
  let message = customMessage || `Your rental ${rentalIdSuffix} has been updated.`;
  let notificationType = 'rental';
  let navigationTarget = userRole === 'landlord' ? '/landlord/bookings' : '/customer/bookings';

  switch (status) {
    case 'booking_pending':
      title = 'Booking Pending';
      message = customMessage || 'Your rental booking is pending confirmation.';
      break;
    case 'new_booking':
      title = 'New Booking';
      message = customMessage || 'You have received a new rental booking request.';
      break;
    case 'booking_confirmed':
      title = 'Booking Confirmed';
      message = customMessage || 'Your rental booking has been confirmed.';
      break;
    case 'booking_cancelled':
      title = 'Booking Cancelled';
      message = customMessage || 'Your rental booking has been cancelled.';
      break;
    case 'move_in_date_set':
      title = 'Move-in Date Set';
      message = customMessage || 'Your move-in date has been set.';
      break;
    case 'move_in_confirmed':
    case 'move_in_confirmed_success':
      title = 'Move-in Confirmed';
      message = customMessage || 'Your move-in has been confirmed.';
      break;
    default:
      title = 'Rental Update';
      message = customMessage || `Your rental booking ${bookingId} status has been updated to ${status}.`;
      break;
  }

  return createNotification(
    userId,
    notificationType,
    title,
    message,
    { rentalId, bookingId, status, relatedEntityId: bookingId, relatedEntityType: 'Rental' },
    `/rentals/${rentalId}`,
    navigationTarget,
    req,
    userRole
  );
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

  // If orderType is healthcare, override notificationType to healthcare
  let finalNotificationType = notificationType;
  if (order.orderType === 'healthcare') {
    finalNotificationType = 'healthcare';
  }

  return createNotification(
    userId,
    finalNotificationType,
    title,
    message,
    { orderId: orderIdStr, status, orderType: order.orderType, relatedEntityId: orderIdStr, relatedEntityType: 'Order' },
    `/orders/${orderIdStr}`,
    navigationTarget,
    req,
    userRole
  );
};

export default null;
