import Notification from '../models/Notification.js';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
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
      type === 'delivered' ||
      type === 'ride_request' ||
      type === 'ride_awaiting_customer_confirmation' ||
      type === 'delivery_confirmation_required' ||
      type === 'payment_confirmation_required' ||
      type === 'booking_confirmation_required' ||
      type === 'ride_confirmation_required' ||
      data?.actionRequired === true
    ) {
      actionRequired = true;
    }

    // Sanitize type parameter to ensure it's in the enum
    const ALLOWED_NOTIFICATION_TYPES = [
      'order', 'order_update', 'order_accepted', 'order_delivered', 'new_order', 'order_payment_confirmed', 'delivery_confirmed',
      'payment', 'payment_received', 'ride_payment_confirmed', 'ride_payment_failed', 'booking_cancelled', 'move_in_date_set',
      'move_in_confirmed', 'move_in_confirmed_success', 'rent_due', 'rent_payment_received', 'rent_payment_confirmed',
      'order_payment_failed', 'rental_payment_failed', 'payment_released', 'ride_awaiting_customer_confirmation',
      'ride_in_progress', 'ride_started', 'ride_declined', 'ride_cancelled', 'ride_pending_payment', 'ride_waiting_rider',
      'ride_no_rider_available', 'booking', 'booking_confirmed', 'booking_request', 'rental_booking', 'message', 'system',
      'ride_request', 'ride_accepted', 'ride_completed'
    ];

    let sanitizedType = type;
    if (!ALLOWED_NOTIFICATION_TYPES.includes(sanitizedType)) {
      if (sanitizedType?.includes('message')) {
        sanitizedType = 'message';
      } else if (sanitizedType?.includes('payment') || sanitizedType?.includes('pay')) {
        sanitizedType = 'payment';
      } else if (sanitizedType?.includes('ride')) {
        if (sanitizedType.includes('cancel')) sanitizedType = 'ride_cancelled';
        else if (sanitizedType.includes('accept')) sanitizedType = 'ride_accepted';
        else if (sanitizedType.includes('complete')) sanitizedType = 'ride_completed';
        else if (sanitizedType.includes('start')) sanitizedType = 'ride_started';
        else sanitizedType = 'system';
      } else if (sanitizedType?.includes('booking') || sanitizedType?.includes('rental')) {
        if (sanitizedType.includes('cancel')) sanitizedType = 'booking_cancelled';
        else if (sanitizedType.includes('confirm')) sanitizedType = 'booking_confirmed';
        else sanitizedType = 'booking';
      } else if (sanitizedType?.includes('order')) {
        if (sanitizedType.includes('accept')) sanitizedType = 'order_accepted';
        else if (sanitizedType.includes('deliver')) sanitizedType = 'order_delivered';
        else sanitizedType = 'order_update';
      } else {
        sanitizedType = 'system';
      }
    }

    const notification = await Notification.create({
      user: userId,
      userId,
      type: sanitizedType,
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
        type: sanitizedType,
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
  let title = 'Payment Update';
  let message = `Your payment for transaction ${String(transactionId).slice(-6).toUpperCase()} has been updated.`;
  let actionRequired = false;

  if (transaction?.status === 'pending') {
    title = 'Confirm Payment Completion';
    message = `Action Required: Your payment of KSh ${amount} is pending. Please confirm payment completion to authorize.`;
    actionRequired = true;
  } else if (transaction?.status === 'completed' || transaction?.status === 'success') {
    title = 'Payment Successful';
    message = `Your payment of KSh ${amount} has been successfully processed.`;
  } else if (transaction?.status === 'failed') {
    title = 'Payment Failed';
    message = `Your payment of KSh ${amount} has failed.`;
  }

  const finalNavigationTarget = navigationTarget || `/${userRole}/transactions?transactionId=${transactionId}`;

  return createNotification(
    userId,
    'payment',
    title,
    message,
    {
      transactionId,
      amount,
      status: transaction?.status,
      relatedEntityId: transactionId,
      relatedEntityType: 'Transaction',
      actionRequired,
    },
    `/payments/${transactionId}`,
    finalNavigationTarget,
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
  let actionRequired = false;

  let navigationTarget;
  if (userRole === 'rider') {
    navigationTarget = `/rider/requests?rideId=${rideId}`;
  } else {
    navigationTarget = `/customer/rides?rideId=${rideId}`;
  }

  switch (status) {
    case 'waiting_rider':
      title = 'Ride Requested';
      message = customMessage || 'Your ride request has been received and is waiting for a rider.';
      break;
    case 'accepted':
      title = 'Rider Accepted';
      message = customMessage || 'A rider has accepted your ride request.';
      break;
    case 'arrived':
    case 'rider_arrived':
      title = 'Rider Arrived';
      message = customMessage || 'Action Required: Your rider has arrived at the pickup location. Please meet them.';
      actionRequired = true;
      break;
    case 'ride_started':
    case 'in_progress':
      title = 'Ride Started';
      message = customMessage || 'Your ride has started. Have a safe journey!';
      break;
    case 'completed':
    case 'ride_completed':
      title = 'Ride Completed';
      message = customMessage || 'Your ride has been completed.';
      break;
    case 'cancelled':
    case 'declined':
    case 'ride_cancelled':
      title = 'Ride Cancelled';
      message = customMessage || 'Your ride has been cancelled.';
      break;
    case 'awaiting_customer_confirmation':
      title = 'Confirm Ride Completion';
      message = customMessage || 'Action Required: Rider marked ride completed. Please confirm to release funds.';
      actionRequired = true;
      break;
    case 'new_ride_request':
    case 'ride_request':
      title = 'New Ride Request';
      message = customMessage || 'Action Required: You have received a new ride request near you.';
      actionRequired = true;
      break;
    case 'customer_waiting':
      title = 'Customer Waiting';
      message = customMessage || 'The customer is waiting for you at the pickup location.';
      break;
    case 'customer_paid':
      title = 'Customer Paid';
      message = customMessage || 'Customer has completed payment for the ride.';
      break;
    default:
      title = 'Ride Update';
      message = customMessage || `Your ride ${rideIdSuffix} status has been updated to ${status}.`;
      break;
  }

  const mainNotification = await createNotification(
    userId,
    notificationType,
    title,
    message,
    {
      rideId,
      status,
      relatedEntityId: rideId,
      relatedEntityType: 'RideRequest',
      actionRequired,
    },
    `/rides/${rideId}`,
    navigationTarget,
    req,
    userRole
  );

  if (userRole === 'landlord') {
    // Notify active caretakers of this landlord as well
    try {
      const caretakers = await User.find({
        role: 'caretaker',
        'caretakerProfile.landlord': userId,
        'caretakerProfile.status': 'active',
      });
      for (const caretaker of caretakers) {
        await createNotification(
          caretaker._id,
          notificationType,
          title,
          message,
          {
            rentalId,
            bookingId,
            status,
            relatedEntityId: bookingId,
            relatedEntityType: 'Rental',
            actionRequired,
          },
          `/rentals/${rentalId}`,
          `/caretaker/bookings?bookingId=${bookingId}`,
          req,
          'caretaker'
        );
      }
    } catch (err) {
      console.error('[Caretaker notification distribution failed]', err);
    }
  }

  return mainNotification;
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
  let actionRequired = false;

  let navigationTarget;
  if (userRole === 'landlord') {
    navigationTarget = `/landlord/bookings?bookingId=${bookingId}`;
  } else {
    navigationTarget = `/customer/bookings?bookingId=${bookingId}`;
  }

  switch (status) {
    case 'booking_pending':
      title = 'Booking Pending';
      message = customMessage || 'Your rental booking is pending confirmation.';
      break;
    case 'new_booking':
    case 'booking_request':
      title = 'New Booking';
      message = customMessage || 'Action Required: You have received a new rental booking request. Please approve or decline.';
      actionRequired = true;
      break;
    case 'booking_confirmed':
    case 'booking_approved':
    case 'approved':
      title = 'Rental Approved';
      message = customMessage || 'Your rental booking has been approved successfully!';
      break;
    case 'booking_cancelled':
    case 'booking_rejected':
    case 'rejected':
      title = 'Rental Rejected';
      message = customMessage || 'Your rental booking has been cancelled or rejected.';
      break;
    case 'move_in_date_set':
      title = 'Move-in Date Set';
      message = customMessage || 'Your move-in date has been set.';
      break;
    case 'move_in_confirmed':
    case 'move_in_confirmed_success':
    case 'tenant_check_in':
      title = 'Tenant Check-in';
      message = customMessage || 'Check-in has been successfully confirmed.';
      break;
    case 'tenant_check_out':
      title = 'Tenant Check-out';
      message = customMessage || 'Check-out has been successfully confirmed.';
      break;
    case 'booking_reminder':
      title = 'Booking Reminder';
      message = customMessage || 'Action Required: This is a reminder to confirm your upcoming booking.';
      actionRequired = true;
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
    {
      rentalId,
      bookingId,
      status,
      relatedEntityId: bookingId,
      relatedEntityType: 'Rental',
      actionRequired,
    },
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
  let notificationType = 'order';
  let title = 'Order Update';
  let message = `Your order #${orderIdStr.slice(-6).toUpperCase()} status has been updated.`;
  let actionRequired = false;

  const orderSuffix = orderIdStr.slice(-6).toUpperCase();

  if (status === 'pending' || status === 'order_placed') {
    notificationType = 'order';
    title = 'Order Placed';
    message = `Your order #${orderSuffix} has been placed successfully.`;
  } else if (status === 'new_order') {
    notificationType = 'new_order';
    title = 'New Order';
    message = `New order #${orderSuffix} received from customer.`;
    actionRequired = true;
  } else if (status === 'order_accepted' || status === 'accepted') {
    notificationType = 'order_accepted';
    title = 'Order Accepted';
    message = `Your order #${orderSuffix} has been accepted. Estimated delivery time: ${order.estimatedDeliveryTime || 'pending'}.`;
  } else if (status === 'order_packed' || status === 'packed') {
    notificationType = 'order_update';
    title = 'Order Packed';
    message = `Your order #${orderSuffix} has been packed.`;
  } else if (status === 'order_shipped' || status === 'shipped') {
    notificationType = 'order_update';
    title = 'Order Shipped';
    message = `Your order #${orderSuffix} has been shipped.`;
  } else if (status === 'order_delivered' || status === 'delivered' || status === 'delivery_confirmation_required') {
    notificationType = 'order_delivered';
    title = 'Order Delivered';
    message = `Your order #${orderSuffix} has been marked as delivered.\nAction Required: Please confirm delivery.`;
    actionRequired = true;
  } else if (status === 'delivery_confirmed') {
    notificationType = 'delivery_confirmed';
    title = 'Delivery Confirmed';
    message = `Customer confirmed delivery for order #${orderSuffix}.\nEscrow funds released.`;
  } else if (status === 'delivery_confirmed_success') {
    notificationType = 'delivery_confirmed';
    title = 'Delivery Confirmed';
    message = `You confirmed delivery successfully for order #${orderSuffix}.`;
  } else if (status === 'processing') {
    notificationType = 'order_update';
    title = 'Order Processing';
    message = `Your order #${orderSuffix} is being processed.`;
  } else if (status === 'paid' || status === 'payment_successful' || status === 'payment_success') {
    notificationType = 'order_payment_confirmed';
    title = 'Payment Confirmed';
    message = `Your payment for order #${orderSuffix} has been confirmed.`;
  } else if (status === 'cancelled' || status === 'order_cancelled' || status === 'failed' || status === 'payment_failed' || status === 'payment_fail') {
    notificationType = 'order_update';
    title = status.includes('fail') ? 'Payment Failed' : 'Order Cancelled';
    message = status.includes('fail')
      ? `Your payment for order #${orderSuffix} has failed.`
      : `Your order #${orderSuffix} has been cancelled.`;
  } else {
    notificationType = 'order_update';
    title = 'Order Updated';
    message = `Your order #${orderSuffix} status: ${status}`;
  }

  // Determine navigation target based on user role
  let navigationTarget;
  if (userRole === 'business') {
    navigationTarget = `/business/orders?orderId=${orderIdStr}`;
  } else {
    if (order.orderType === 'healthcare') {
      navigationTarget = `/customer/healthcare?healthcareOrderId=${orderIdStr}`;
    } else {
      navigationTarget = `/customer/order/${orderIdStr}`;
    }
  }

  // If orderType is healthcare, override notificationType to healthcare
  let finalNotificationType = notificationType;
  if (order.orderType === 'healthcare') {
    finalNotificationType = 'healthcare';
    title = `Healthcare: ${title}`;
  }

  return createNotification(
    userId,
    finalNotificationType,
    title,
    message,
    {
      orderId: orderIdStr,
      healthcareOrderId: orderIdStr,
      status,
      orderType: order.orderType,
      relatedEntityId: orderIdStr,
      relatedEntityType: 'Order',
      actionRequired,
    },
    `/orders/${orderIdStr}`,
    navigationTarget,
    req,
    userRole
  );
};

/**
 * Register a push subscription
 */
export const subscribePush = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { subscription, role, deviceType, browser, notificationPermission } = req.body;

  const sub = await PushSubscription.findOneAndUpdate(
    { 'subscription.endpoint': subscription.endpoint },
    {
      userId,
      role,
      deviceType,
      browser,
      notificationPermission,
      subscription,
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    message: 'Push subscription registered successfully',
    data: sub,
  });
});

/**
 * Unregister a push subscription
 */
export const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  await PushSubscription.findOneAndDelete({ 'subscription.endpoint': endpoint });

  res.status(200).json({
    success: true,
    message: 'Push subscription removed successfully',
  });
});

export default null;
