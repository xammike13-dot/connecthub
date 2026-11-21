import { getIO } from '../utils/socket.js';
import { v4 as uuidv4 } from 'uuid';
import mpesaService from '../services/mpesaService.js';
import { calculatePayment, calculateShoppingPayment, calculateRentalPayment } from '../utils/paymentCalculator.js';
import {
  calculateFixedFare,
  calculateFare,
  calculateFareWithRiderRate,
  isNightRate,
  isNightRateInNairobi,
  normalizeArea,
} from '../utils/rideFareCalculator.js';
import { creditPendingEscrow, releaseEscrow } from '../utils/walletService.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Rental from '../models/Rental.js';
import RideRequest from '../models/RideRequest.js';
import SystemLog from '../models/SystemLog.js';
import { asyncHandler } from '../middleware/error.js';
import { ResponseError } from '../middleware/error.js';
import { createPaymentNotification, createNotification } from './notificationController.js';
import { deductOrderInventory } from './orderController.js';
import {
  emitRideRequestToRider,
  getRideRequestTimeoutDate,
  isRiderAvailableForPickup,
} from '../services/rideAssignmentService.js';

const normalizeEntityType = (type) => {
  const lower = String(type || '').toLowerCase();
  if (lower === 'order') return 'order';
  if (lower === 'rental') return 'rental';
  if (lower === 'ride' || lower === 'riderequest') return 'ride';
  return lower;
};

const createPaidRideRequest = async (transaction, pendingRideData, req) => {
  const existingRide = await RideRequest.findOne({ transaction: transaction._id });
  if (existingRide) {
    const assignedRiderId = existingRide.rider || null;
    if (
      transaction.relatedEntity?.toString() !== existingRide._id.toString() ||
      transaction.provider?.toString() !== assignedRiderId?.toString()
    ) {
      transaction.relatedEntity = existingRide._id;
      transaction.provider = assignedRiderId;
      await transaction.save();
    }
    return existingRide;
  }

  const selectedRiderId = pendingRideData.selectedRiderId;
  const riderIsAvailable = selectedRiderId
    ? await isRiderAvailableForPickup(selectedRiderId, pendingRideData.pickupLocation)
    : false;
  const assignedRiderId = riderIsAvailable ? selectedRiderId : null;
  const formatCoordinates = (location) => {
    if (Array.isArray(location?.coordinates)) return location.coordinates;
    if (Array.isArray(location?.coordinates?.coordinates)) return location.coordinates.coordinates;
    return [];
  };
  const pickupLocation = pendingRideData.pickupLocation || {};
  const dropoffLocation = pendingRideData.dropoffLocation || {};

  let rideRequest;
  try {
    rideRequest = await RideRequest.create({
      customer: transaction.customer._id || transaction.customer,
      pickupLocation: {
        name: pickupLocation.name || pickupLocation.address || 'Pickup Location',
        address: pickupLocation.address || pickupLocation.name || 'Pickup Location',
        landmark: pickupLocation.landmark,
        coordinates: formatCoordinates(pickupLocation),
      },
      dropoffLocation: {
        name: dropoffLocation.name || dropoffLocation.address || 'Dropoff Location',
        address: dropoffLocation.address || dropoffLocation.name || 'Dropoff Location',
        landmark: dropoffLocation.landmark,
        coordinates: formatCoordinates(dropoffLocation),
      },
      estimatedDistance: pendingRideData.estimatedDistance,
      rideType: pendingRideData.rideType || 'bodaboda',
      passengers: 1,
      status: assignedRiderId ? 'waiting_rider' : 'no_rider_available',
      responseExpiresAt: assignedRiderId ? getRideRequestTimeoutDate() : undefined,
      paymentStatus: 'paid',
      paymentMethod: 'mpesa',
      transaction: transaction._id,
      fare: pendingRideData.fareBreakdown,
      escrowStatus: 'held',
      fundsReleased: false,
      ...(assignedRiderId && { rider: assignedRiderId }),
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicateRide = await RideRequest.findOne({ transaction: transaction._id });
    if (!duplicateRide) throw error;
    transaction.relatedEntity = duplicateRide._id;
    transaction.provider = duplicateRide.rider || null;
    await transaction.save();
    return duplicateRide;
  }

  transaction.relatedEntity = rideRequest._id;
  transaction.provider = assignedRiderId;
  await transaction.save();

  const io = req.app.get('io');
  const customerId = transaction.customer._id || transaction.customer;
  if (assignedRiderId) {
    emitRideRequestToRider(io, rideRequest, transaction.customer);
    try {
      await createNotification(
        assignedRiderId,
        'ride_request',
        'New Ride Request',
        `You have a new paid ride request. Pickup: ${rideRequest.pickupLocation?.address || 'selected location'}.`,
        { rideId: rideRequest._id },
        `/rider/rides/${rideRequest._id}`,
        '/rider/rides',
        req,
        'rider'
      );
    } catch (error) {
      console.error('[Rider ride request notification failed]', error);
    }
  } else {
    io?.to(`user_${customerId}`).emit('ride_rider_unavailable', {
      rideId: rideRequest._id,
      status: rideRequest.status,
      message: 'Your selected rider is no longer available. Choose another rider; your payment is already confirmed.',
    });
    try {
      await createNotification(
        customerId,
        'ride_no_rider_available',
        'Rider Unavailable',
        'Your selected rider is no longer available. Choose another available rider; you do not need to pay again.',
        { rideId: rideRequest._id },
        `/customer/rides/${rideRequest._id}`,
        '/customer/rides',
        req
      );
    } catch (error) {
      console.error('[Customer rider unavailable notification failed]', error);
    }
  }

  io?.to(`user_${customerId}`).emit('payment_confirmed', {
    transactionRef: transaction.transactionRef,
    status: 'paid',
    paymentStatus: 'paid',
    rideId: rideRequest._id,
    customerId,
    amount: transaction.amount.totalAmount,
    mpesaReceipt: transaction.mpesaReceiptNumber,
  });

  try {
    await createNotification(
      transaction.customer._id || transaction.customer,
      'ride_payment_confirmed',
      assignedRiderId ? 'Payment Confirmed - Waiting for Rider' : 'Payment Confirmed - Choose Another Rider',
      assignedRiderId
        ? `Your payment of KSh ${transaction.amount.totalAmount} is confirmed. Your selected rider has been notified.`
        : 'Your payment is confirmed, but the selected rider is unavailable. Choose another available rider without paying again.',
      { rideId: rideRequest._id, transactionId: transaction._id },
      `/customer/rides/${rideRequest._id}`,
      '/customer/rides',
      req
    );
  } catch (error) {
    console.error('[Customer ride payment notification failed]', error);
  }

  return rideRequest;
};

/**
 * Handle marketplace order payment success — set paid status and credit escrow.
 */
const handleOrderPaymentSuccess = async (transaction, orderId, req) => {
  const order = await Order.findById(orderId)
    .populate('customer', 'name email phone')
    .populate('business');

  if (!order) return null;

  // Log order payment update before save
  console.log('[ORDER PAYMENT UPDATE]', {
    orderId: order._id,
    paymentStatus: order.paymentStatus,
    status: order.status
  });

  // Update payment-related fields and set escrow status
  order.paymentStatus = 'paid';
  order.status = 'paid';
  order.escrowStatus = 'held';
  order.paymentId = transaction.mpesaReceiptNumber;
  order.mpesaReceiptNumber = transaction.mpesaReceiptNumber;
  order.transaction = transaction._id;
  transaction.escrowStatus = 'held';
  await transaction.save();
  await order.save();

  // Deduct inventory for all ordered products and variants
  try {
    await deductOrderInventory(order, req?.app?.get('io') || getIO());
  } catch (invErr) {
    console.error('[Failed to deduct order inventory]', invErr);
  }

  // Reload order to verify save
  const updatedOrder = await Order.findById(order._id);
  console.log('[ORDER AFTER SAVE]', {
    paymentStatus: updatedOrder.paymentStatus,
    status: updatedOrder.status,
    escrowStatus: updatedOrder.escrowStatus,
  });

  const businessId = order.business?._id || order.business;
  const providerAmount = transaction.providerReceives || order.finalAmount || 0;
  if (businessId && providerAmount > 0) {
    await creditPendingEscrow(businessId, providerAmount, 'marketplace_payment');
  }

  const io = req?.app?.get('io') || getIO();

  // Find active business assistants to notify them as well
  let activeAssistants = [];
  try {
    activeAssistants = await User.find({
      role: 'assistant',
      'assistantProfile.business': businessId,
      'assistantProfile.status': 'active',
    });
  } catch (asstErr) {
    console.error('[Failed to query business assistants]', asstErr);
  }

  const orderNumber = order._id.toString().slice(-6).toUpperCase();
  const customerName = transaction.customer?.name || order.customer?.name || 'Customer';
  const customerPhone = transaction.customer?.phone || order.customer?.phone || order.deliveryAddress?.phone || '';

  const orderNotificationPayload = {
    orderId: order._id,
    orderNumber,
    customer: {
      _id: transaction.customer?._id || order.customer?._id,
      name: customerName,
      phone: customerPhone,
    },
    items: order.items,
    totalAmount: order.totalAmount,
    finalAmount: order.finalAmount,
    deliveryFee: order.deliveryFee,
    deliveryAddress: order.deliveryAddress,
    deliveryInstructions: order.notes || '',
    paymentStatus: order.paymentStatus,
    escrowStatus: order.escrowStatus,
    status: order.status,
    createdAt: order.createdAt,
  };

  if (io && businessId) {
    console.log('[EMITTING NEW ORDER]', {
      businessId,
      orderId: order._id,
      room: `business_${businessId}`,
    });

    // Notify Business Owner
    io.to(`business_${businessId}`).emit('new_order', orderNotificationPayload);
    io.to(`user_${businessId}`).emit('new_order', orderNotificationPayload);

    // Notify Active Business Assistants
    activeAssistants.forEach((assistant) => {
      io.to(`user_${assistant._id}`).emit('new_order', orderNotificationPayload);
    });

    // Notify Customer
    io.to(`user_${order.customer._id || order.customer}`).emit('order_created', {
      orderId: order._id,
      orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      escrowStatus: order.escrowStatus,
    });

    // If delivery is needed, broadcast delivery opportunity to available riders
    if (order.deliveryFee > 0 || order.deliveryAddress?.address) {
      io.emit('delivery_available', {
        orderId: order._id,
        orderNumber,
        businessName: order.business?.name || 'Business Partner',
        deliveryAddress: order.deliveryAddress,
        deliveryFee: order.deliveryFee,
        itemsCount: order.items?.length || 0,
      });
    }

    console.log('[SOCKET EVENTS EMITTED]');

    // Create DB Notification for Business Owner
    try {
      await createNotification(
        businessId,
        'new_order',
        'New Paid Order Received',
        `New paid order #${orderNumber} from ${customerName}. Products: ${order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}. Amount: KSh ${order.finalAmount}.`,
        orderNotificationPayload,
        `/business/orders`,
        '/business/orders',
        req,
        'business'
      );
    } catch (err) {
      console.error('[Order notification failed]', err);
    }

    // Create DB Notification for Each Active Assistant
    for (const assistant of activeAssistants) {
      try {
        await createNotification(
          assistant._id,
          'new_order',
          'New Paid Order Received (Assigned)',
          `New paid order #${orderNumber} received for your business from ${customerName}. Products: ${order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}. Amount: KSh ${order.finalAmount}.`,
          orderNotificationPayload,
          `/assistant/orders`,
          '/assistant/orders',
          req,
          'assistant'
        );
      } catch (asstNotifErr) {
        console.error('[Assistant notification failed]', asstNotifErr);
      }
    }
  }

  try {
    await createNotification(
      transaction.customer._id,
      'order_payment_confirmed',
      'Order Payment Confirmed (In Escrow)',
      `Your payment of KSh ${transaction.amount.totalAmount} for order #${orderNumber} is confirmed and held in secure escrow. The business has been notified to prepare your order.`,
      { orderId: order._id, transactionId: transaction._id, orderNumber },
      `/customer/orders`,
      '/customer/orders',
      req,
      'customer'
    );
  } catch (err) {
    console.error('[Customer order notification failed]', err);
  }

  if (io && transaction.customer?._id) {
    io.to(`user_${transaction.customer._id}`).emit('payment_confirmed', {
      transactionRef: transaction.transactionRef,
      status: 'paid',
      paymentStatus: 'paid',
      orderId: order._id,
      customerId: transaction.customer._id,
      businessId,
      amount: order.finalAmount,
      mpesaReceipt: transaction.mpesaReceiptNumber,
    });
  }

  console.log('[ORDER PAYMENT SUCCESS]', { orderId: order._id, status: order.status });
  return order;
};

/**
 * Handle rental booking payment success.
 */
const handleRentalPaymentSuccess = async (transaction, pendingEntityData, req) => {
  console.log('[RENTAL PAYMENT SUCCESS] Processing rental payment success');

  const { entityId, paymentBreakdown } = pendingEntityData;
  const rental = await Rental.findById(entityId).populate('landlord', 'name email phone');
  if (!rental) {
    console.log('[RENTAL PAYMENT SUCCESS] Rental not found:', entityId);
    return null;
  }

  const customerId = transaction.customer._id || transaction.customer;

  // Find or create booking for this customer
  let booking = rental.bookings?.find(
    (b) => b.customer?.toString() === customerId.toString() && b.paymentStatus !== 'paid'
  );

  if (!booking) {
    console.log('[RENTAL PAYMENT SUCCESS] No pending booking found, creating new booking');
    // Create booking automatically on payment
    const months = 1;
    const basePrice = rental.monthlyPrice * months;
    const paymentBreakdownCalc = calculateRentalPayment(rental.monthlyPrice, months);

    const newBooking = {
      customer: customerId,
      basePrice,
      totalPrice: paymentBreakdownCalc.customerPays,
      platformFee: paymentBreakdownCalc.platformFee,
      customerShare: paymentBreakdownCalc.customerShare,
      providerShare: paymentBreakdownCalc.providerShare,
      landlordReceives: paymentBreakdownCalc.providerReceives,
      months,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'mpesa',
      escrowStatus: 'held',
      fundsReleased: false,
    };

    rental.bookings.push(newBooking);
    booking = rental.bookings[rental.bookings.length - 1];
    console.log('[RENTAL PAYMENT SUCCESS] New booking created:', booking._id);
  } else {
    console.log('[RENTAL PAYMENT SUCCESS] Found existing booking:', booking._id);
  }

  // Update booking with payment confirmation
  booking.paymentStatus = 'paid';
  booking.status = 'confirmed';
  booking.stage = 'booking_received';
  booking.transaction = transaction._id;
  booking.escrowStatus = 'held'; // Money held in escrow until move-in confirmed
  booking.fundsReleased = false;

  await rental.save();

  // Credit pending escrow to landlord wallet
  const landlordId = rental.landlord?._id || rental.landlord;
  const providerReceives = transaction.providerReceives || booking.landlordReceives || booking.totalPrice;

  if (landlordId && providerReceives > 0) {
    await creditPendingEscrow(landlordId, providerReceives, 'rental_payment');
    console.log('[RENTAL PAYMENT SUCCESS] Credited pending escrow:', { landlordId, amount: providerReceives });
  }

  transaction.relatedEntity = rental._id;
  transaction.relatedEntityType = 'rental';
  transaction.escrowStatus = 'held';
  await transaction.save();

  // Find assigned caretaker or landlord's caretakers
  let caretakerUsers = [];
  try {
    if (rental.caretaker) {
      caretakerUsers = await User.find({ _id: rental.caretaker, role: 'caretaker', 'caretakerProfile.status': 'active' });
    } else if (landlordId) {
      caretakerUsers = await User.find({ role: 'caretaker', 'caretakerProfile.landlord': landlordId, 'caretakerProfile.status': 'active' });
    }
  } catch (ctErr) {
    console.error('[Failed to find caretakers]', ctErr);
  }

  const customerName = transaction.customer?.name || 'Customer';
  const customerPhone = transaction.customer?.phone || '';
  const moveInDateStr = booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString() : 'Pending confirmation';

  const bookingNotificationPayload = {
    rentalId: rental._id,
    bookingId: booking._id,
    rentalName: rental.rentalName,
    rentalType: rental.rentalType,
    customer: {
      _id: customerId,
      name: customerName,
      phone: customerPhone,
    },
    monthlyPrice: rental.monthlyPrice,
    totalPrice: booking.totalPrice,
    bookingDuration: `${booking.months || 1} month(s)`,
    moveInDate: booking.moveInDate,
    paymentStatus: booking.paymentStatus,
    escrowStatus: booking.escrowStatus,
    stage: booking.stage,
  };

  const io = req?.app?.get('io') || getIO();
  if (io && landlordId) {
    // Notify landlord
    io.to(`user_${landlordId}`).emit('new_booking', bookingNotificationPayload);

    // Notify assigned caretakers
    caretakerUsers.forEach((ct) => {
      io.to(`user_${ct._id}`).emit('new_booking', bookingNotificationPayload);
    });

    try {
      await createNotification(
        landlordId,
        'new_booking',
        'New Rental Booking Received (In Escrow)',
        `New paid booking for ${rental.rentalName} from ${customerName}. Move-in: ${moveInDateStr}. Amount: KSh ${transaction.amount.totalAmount}. Please accept or decline.`,
        bookingNotificationPayload,
        `/landlord/bookings`,
        '/landlord/bookings',
        req,
        'landlord'
      );
    } catch (err) {
      console.error('[Landlord booking notification failed]', err);
    }

    for (const ct of caretakerUsers) {
      try {
        await createNotification(
          ct._id,
          'new_booking',
          'New Rental Booking Received (Caretaker)',
          `New paid booking for ${rental.rentalName} from ${customerName}. Move-in: ${moveInDateStr}. Amount: KSh ${transaction.amount.totalAmount}.`,
          bookingNotificationPayload,
          `/caretaker/bookings`,
          '/caretaker/bookings',
          req,
          'caretaker'
        );
      } catch (ctNotifErr) {
        console.error('[Caretaker notification failed]', ctNotifErr);
      }
    }
  }

  try {
    await createNotification(
      customerId,
      'order_payment_confirmed',
      'Rental Payment Confirmed (In Escrow)',
      `Your payment of KSh ${transaction.amount.totalAmount} for ${rental.rentalName} is held in secure escrow. The landlord has been notified.`,
      { rentalId: rental._id, bookingId: booking._id, transactionId: transaction._id },
      `/customer/bookings`,
      '/customer/rentals',
      req,
      'customer'
    );
  } catch (err) {
    console.error('[Customer rental notification failed]', err);
  }

  if (io) {
    io.to(`user_${customerId}`).emit('payment_confirmed', {
      transactionRef: transaction.transactionRef,
      status: 'paid',
      paymentStatus: 'paid',
      rentalId: rental._id,
      amount: transaction.amount.totalAmount,
      mpesaReceipt: transaction.mpesaReceiptNumber,
    });
  }

  console.log('[RENTAL PAYMENT SUCCESS] Complete:', { rentalId: rental._id, bookingId: booking?._id });
  return { rental, booking };
};

/**
 * Handle monthly rent payment success
 * This is called when a customer pays their monthly rent
 */
const handleMonthlyRentPaymentSuccess = async (transaction, pendingEntityData, req) => {
  console.log('[MONTHLY RENT PAYMENT SUCCESS] Processing monthly rent payment success');

  const { entityId, bookingId } = pendingEntityData;
  const rental = await Rental.findById(entityId).populate('landlord', 'name email phone');
  if (!rental) {
    console.log('[MONTHLY RENT PAYMENT SUCCESS] Rental not found:', entityId);
    return null;
  }

  const customerId = transaction.customer._id || transaction.customer;

  // Find the booking
  const booking = rental.bookings.id(bookingId);
  if (!booking) {
    console.log('[MONTHLY RENT PAYMENT SUCCESS] Booking not found:', bookingId);
    return null;
  }

  // Update booking with payment confirmation
  booking.lastRentPaymentDate = new Date();

  // Calculate next rent due date (30 days from current due date)
  const currentDueDate = booking.nextRentDueDate ? new Date(booking.nextRentDueDate) : new Date();
  const nextRentDue = new Date(currentDueDate);
  nextRentDue.setDate(nextRentDue.getDate() + 30);
  booking.nextRentDueDate = nextRentDue;

  await rental.save();

  console.log('[MONTHLY RENT PAYMENT SUCCESS] Booking updated:', {
    bookingId: booking._id,
    rentalId: rental._id,
    customerId,
    lastRentPaymentDate: booking.lastRentPaymentDate,
    nextRentDueDate: booking.nextRentDueDate,
  });

  // Credit landlord wallet directly (no escrow for monthly rent)
  const landlordId = rental.landlord?._id || rental.landlord;
  const providerReceives = transaction.providerReceives || booking.landlordReceives || transaction.amount.totalAmount;

  if (landlordId && providerReceives > 0) {
    await releaseEscrow(landlordId, providerReceives, 'monthly_rent_payment');
    console.log('[MONTHLY RENT PAYMENT SUCCESS] Credited landlord wallet:', { landlordId, amount: providerReceives });
  }

  // Update transaction status
  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transaction.save();

  const io = req?.app.get('io');
  
  // Notify landlord
  if (io && landlordId) {
    try {
      await createNotification(
        landlordId,
        'rent_payment_received',
        'Monthly Rent Payment Received',
        `Monthly rent payment of KSh ${transaction.amount.totalAmount} for ${rental.rentalName} has been received.`,
        { rentalId: rental._id, bookingId: booking._id, amount: transaction.amount.totalAmount },
        `/landlord/bookings`,
      '/landlord/bookings',
      req,
      'landlord'
    );
    } catch (err) {
      console.error('[Landlord rent payment notification failed]', err);
    }

    io.to(`user_${landlordId}`).emit('rent_payment_received', {
      rentalId: rental._id,
      bookingId: booking._id,
      amount: transaction.amount.totalAmount,
      message: 'Monthly rent payment received.',
    });
  }

  // Notify customer
  try {
    await createNotification(
      customerId,
      'rent_payment_confirmed',
      'Rent Payment Confirmed',
      `Your monthly rent payment of KSh ${transaction.amount.totalAmount} for ${rental.rentalName} has been confirmed. Next payment due: ${nextRentDue.toLocaleDateString()}.`,
      { rentalId: rental._id, transactionId: transaction._id, nextRentDueDate: nextRentDue },
      `/customer/bookings`,
      '/customer/bookings',
    req,
    'customer'
  );
  } catch (err) {
    console.error('[Customer rent payment notification failed]', err);
  }

  if (io) {
    io.to(`user_${customerId}`).emit('rent_payment_confirmed', {
      transactionRef: transaction.transactionRef,
      status: 'completed',
      rentalId: rental._id,
      amount: transaction.amount.totalAmount,
      nextRentDueDate: nextRentDue,
    });
  }

  console.log('[MONTHLY RENT PAYMENT SUCCESS] Complete:', { rentalId: rental._id, bookingId: booking._id });
  return { rental, booking };
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get routing distance between pickup and dropoff
 */
const getRoutingDistance = async (pickup, dropoff) => {
  const pickupCoords = pickup.coordinates?.coordinates || [0, 0];
  const dropoffCoords = dropoff.coordinates?.coordinates || [0, 0];

  const pickupLat = pickupCoords[1];
  const pickupLng = pickupCoords[0];
  const dropoffLat = dropoffCoords[1];
  const dropoffLng = dropoffCoords[0];

  // Try Google Maps Distance Matrix API if configured
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;

  if (googleMapsKey && googleMapsKey !== 'your_google_maps_api_key') {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${dropoffLat},${dropoffLng}&key=${googleMapsKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        return data.rows[0].elements[0].distance.value;
      }
    } catch (error) {
      console.error('Google Maps API error, falling back to Haversine:', error.message);
    }
  }

  // Fallback to Haversine calculation
  return calculateHaversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
};

/**
 * Determine if current time is night rate
 */
const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 5;
};

/**
 * STEP 1: Calculate fixed fare estimate for ride booking
 */
export const calculateRideFareEstimate = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, pickup, destination } = req.body;

  const effectivePickup = pickup || pickupLocation;
  const effectiveDestination = destination || dropoffLocation;

  console.log('[calculateRideFareEstimate] Request:', { effectivePickup, effectiveDestination });

  if (!effectivePickup || !effectiveDestination) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  try {
    const fareBreakdown = calculateFixedFare(effectivePickup, effectiveDestination);
    console.log('[calculateRideFareEstimate] Fixed fare calculated:', fareBreakdown);

    res.status(200).json({
      success: true,
      data: fareBreakdown,
    });
  } catch (err) {
    throw new ResponseError(err.message || 'Invalid or unsupported route combination', 400);
  }
});

/**
 * Initiate M-Pesa STK Push with specific rider
 * Backend enforces authoritative fixed fare calculation (client fares are ignored).
 */
export const initiateMpesaPaymentWithRider = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const {
    pickupLocation,
    dropoffLocation,
    pickup,
    destination,
    phoneNumber,
    riderId,
    rideType = 'bodaboda'
  } = req.body;

  const effectivePickup = pickup || pickupLocation;
  const effectiveDestination = destination || dropoffLocation;

  console.log('[initiateMpesaPaymentWithRider] Starting payment flow:', {
    customerId,
    effectivePickup,
    effectiveDestination,
    phoneNumber,
    riderId,
  });

  if (!effectivePickup || !effectiveDestination) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  if (!riderId) {
    throw new ResponseError('Selected rider ID is required', 400);
  }

  const rider = await User.findById(riderId);
  if (!rider) {
    throw new ResponseError('Selected rider not found', 404);
  }

  if (rider.role !== 'rider') {
    throw new ResponseError('Selected user is not a rider', 400);
  }

  const riderProfile = rider.riderProfile || {};
  if (!(await isRiderAvailableForPickup(riderId, effectivePickup))) {
    throw new ResponseError('Selected rider is no longer available. Please choose another rider.', 409);
  }
  const pickupArea = normalizeArea(effectivePickup);
  const riderWorkingAreas = riderProfile.workingArea?.selectedWorkingAreas || [];
  if (pickupArea && !riderWorkingAreas.some((area) => normalizeArea(area) === pickupArea)) {
    throw new ResponseError('Selected rider does not serve the chosen pickup area. Please choose another rider.', 409);
  }

  // Calculate fixed fare independently on the server using Africa/Nairobi time
  let fareBreakdown;
  try {
    fareBreakdown = calculateFixedFare(effectivePickup, effectiveDestination);
  } catch (err) {
    throw new ResponseError(err.message || 'Invalid or unsupported route combination', 400);
  }

  const totalAmount = fareBreakdown.totalFare;
  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  const formatCoordinates = (loc) => {
    if (!loc) return [];
    if (Array.isArray(loc.coordinates)) return loc.coordinates;
    if (loc.coordinates && Array.isArray(loc.coordinates.coordinates)) return loc.coordinates.coordinates;
    return [];
  };

  const storedPickup = {
    name: fareBreakdown.pickup,
    address: typeof pickupLocation === 'string'
      ? pickupLocation
      : (pickupLocation?.address || pickupLocation?.name || fareBreakdown.pickup),
    landmark: pickupLocation?.landmark,
    coordinates: formatCoordinates(pickupLocation || effectivePickup),
  };

  const storedDropoff = {
    name: fareBreakdown.destination,
    address: typeof dropoffLocation === 'string'
      ? dropoffLocation
      : (dropoffLocation?.address || dropoffLocation?.name || fareBreakdown.destination),
    landmark: dropoffLocation?.landmark,
    coordinates: formatCoordinates(dropoffLocation || effectiveDestination),
  };

  const transactionPayload = {
    transactionRef,
    type: 'ride',
    customer: customerId,
    provider: riderId,
    status: 'pending',
    paymentMethod: 'mpesa',
    amount: {
      baseAmount: fareBreakdown.baseFare,
      deliveryFee: 0,
      platformFee: fareBreakdown.platformFee || 0,
      customerShare: fareBreakdown.customerShare || 0,
      providerShare: fareBreakdown.riderShare || 0,
      customerPays: totalAmount,
      providerReceives: fareBreakdown.riderReceives || totalAmount,
      platformReceives: fareBreakdown.platformFee || 0,
      totalAmount: totalAmount,
    },
    commission: {
      totalCommission: fareBreakdown.platformFee || 0,
      customerShare: fareBreakdown.customerShare || 0,
      providerShare: fareBreakdown.riderShare || 0,
      providerReceives: fareBreakdown.riderReceives || totalAmount,
    },
    customerPaid: totalAmount,
    providerReceives: fareBreakdown.riderReceives || totalAmount,
    relatedEntity: null,
    relatedEntityType: 'RideRequest',
    pendingRideData: {
      pickupLocation: storedPickup,
      dropoffLocation: storedDropoff,
      estimatedDistance: 0,
      rideType,
      selectedRiderId: riderId,
      fareBreakdown: {
        ...fareBreakdown,
        riderId,
      },
    },
  };

  const transaction = await Transaction.create(transactionPayload);

  console.log('[initiateMpesaPaymentWithRider] Transaction created:', transactionRef);

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new ResponseError('Customer not found', 404);
  }

  const rawPhone = phoneNumber || customer.phone;
  const stkPhone = normalizeKenyanPhone(rawPhone) || rawPhone;

  console.log('[initiateMpesaPaymentWithRider] Initiating STK Push to:', stkPhone, 'Amount:', totalAmount);

  const suffix = transactionRef.split('-')[1] || transactionRef.slice(-8);
  const compliantAccountReference = `TXN${suffix}`;

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: stkPhone,
    amount: totalAmount,
    transactionRef: transactionRef,
    accountReference: compliantAccountReference,
    transactionDesc: 'Ride Payment',
  });

  if (!mpesaResponse.success) {
    transaction.status = 'failed';
    transaction.errorMessage = mpesaResponse.message;
    await transaction.save();

    // Log payment failure to SystemLog
    SystemLog.create({
      type: 'payment_failure',
      message: `Rider STK Push initiation failed: ${mpesaResponse.message}`,
      details: { mpesaResponse, transactionRef, phoneNumber: stkPhone, riderId },
      user: customerId
    }).catch(e => console.error('Failed to log payment_failure in initiateMpesaPaymentWithRider:', e.message));

    throw new ResponseError(mpesaResponse.message || 'STK Push failed', 400);
  }

  transaction.mpesaReceiptNumber = mpesaResponse.data?.CheckoutRequestID;
  transaction.darajaResponse = mpesaResponse.data;
  await transaction.save();

  res.status(200).json({
    success: true,
    message: 'STK Push initiated. Please check your phone to complete payment.',
    data: {
      transactionRef,
      checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
      amount: totalAmount,
      phone: stkPhone,
      fare: fareBreakdown,
    },
  });
});

/**
 * STEP 2: Initiate M-Pesa STK Push for ride payment
 */
/**
 * Normalizes phone numbers strictly to Kenyan format: 2547XXXXXXXX or 2541XXXXXXXX
 */
export const normalizeKenyanPhone = (phoneNumber) => {
  if (!phoneNumber) return null;
  let cleaned = String(phoneNumber).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // already starts with 254
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    cleaned = '254' + cleaned;
  }
  // Validate Kenyan format: 2547XXXXXXXX or 2541XXXXXXXX (12 digits total)
  if (!/^254(7\d{8}|1\d{8})$/.test(cleaned)) {
    return null;
  }
  return cleaned;
};

/**
 * Initiate M-Pesa STK Push for an Order (POST /api/payments/mpesa/stkpush)
 */
export const initiateOrderSTKPush = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { orderId, phoneNumber } = req.body;

  if (!orderId) {
    throw new ResponseError('Order ID is required to initiate payment', 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ResponseError('Order not found', 404);
  }

  if (order.customer.toString() !== customerId.toString() && req.user.role !== 'admin') {
    throw new ResponseError('Not authorized to pay for this order', 403);
  }

  if (order.paymentStatus === 'paid' || order.status === 'paid') {
    throw new ResponseError('This order has already been paid for', 400);
  }

  const rawPhone = phoneNumber || order.deliveryAddress?.phone || req.user.phone;
  const formattedPhone = normalizeKenyanPhone(rawPhone);
  if (!formattedPhone) {
    throw new ResponseError('Invalid Kenyan M-Pesa phone number. Please enter a valid number (e.g. 07XXXXXXXX or 01XXXXXXXX)', 400);
  }

  const amount = Math.max(1, Math.round(order.finalAmount || order.totalAmount || 1));

  console.log('[STK PUSH ORDER INITIATION]', {
    orderId: order._id,
    customerId,
    formattedPhone,
    amount,
  });

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: formattedPhone,
    amount,
    transactionRef: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
    accountReference: `ORD${order._id.toString().slice(-6).toUpperCase()}`,
    transactionDesc: 'Olafasta Order',
  });

  const checkoutRequestId = mpesaResponse.CheckoutRequestID || mpesaResponse.checkoutRequestID;
  if (!checkoutRequestId) {
    throw new ResponseError(mpesaResponse.CustomerMessage || 'Failed to trigger M-Pesa prompt. Please try again.', 400);
  }

  // Save checkoutRequestId to pending order
  order.checkoutRequestId = checkoutRequestId;
  order.paymentStatus = 'pending';
  order.status = 'pending_payment';
  if (order.deliveryAddress) {
    order.deliveryAddress.phone = formattedPhone;
  }
  await order.save();

  res.status(200).json({
    success: true,
    message: 'M-Pesa STK Push initiated. Please enter your PIN on your phone.',
    data: {
      checkoutRequestId,
      orderId: order._id,
      amount,
      customerMessage: mpesaResponse.CustomerMessage || 'Please check your phone to complete payment.',
    },
  });
});

export const initiateMpesaPayment = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const {
    pickupLocation,
    dropoffLocation,
    pickup,
    destination,
    phoneNumber,
    riderId,
    rideType = 'bodaboda'
  } = req.body;

  const effectivePickup = pickup || pickupLocation;
  const effectiveDestination = destination || dropoffLocation;

  console.log('[initiateMpesaPayment] Starting payment flow:', {
    customerId,
    effectivePickup,
    effectiveDestination,
    phoneNumber,
  });

  if (!effectivePickup || !effectiveDestination) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  if (!riderId) {
    throw new ResponseError('Select an available rider before starting payment', 400);
  }
  if (!(await isRiderAvailableForPickup(riderId, effectivePickup))) {
    throw new ResponseError('Selected rider is no longer available. Please choose another rider.', 409);
  }

  // Calculate fixed fare independently on the server using Africa/Nairobi time
  let fareBreakdown;
  try {
    fareBreakdown = calculateFixedFare(effectivePickup, effectiveDestination);
  } catch (err) {
    throw new ResponseError(err.message || 'Invalid or unsupported route combination', 400);
  }

  const totalAmount = fareBreakdown.totalFare;
  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  const formatCoordinates = (loc) => {
    if (!loc) return [];
    if (Array.isArray(loc.coordinates)) return loc.coordinates;
    if (loc.coordinates && Array.isArray(loc.coordinates.coordinates)) return loc.coordinates.coordinates;
    return [];
  };

  const storedPickup = {
    name: fareBreakdown.pickup,
    address: typeof pickupLocation === 'string'
      ? pickupLocation
      : (pickupLocation?.address || pickupLocation?.name || fareBreakdown.pickup),
    landmark: pickupLocation?.landmark,
    coordinates: formatCoordinates(pickupLocation || effectivePickup),
  };

  const storedDropoff = {
    name: fareBreakdown.destination,
    address: typeof dropoffLocation === 'string'
      ? dropoffLocation
      : (dropoffLocation?.address || dropoffLocation?.name || fareBreakdown.destination),
    landmark: dropoffLocation?.landmark,
    coordinates: formatCoordinates(dropoffLocation || effectiveDestination),
  };

  const transaction = await Transaction.create({
    transactionRef,
    type: 'ride',
    customer: customerId,
    provider: riderId,
    status: 'pending',
    amount: {
      baseAmount: fareBreakdown.baseFare,
      deliveryFee: 0,
      platformFee: fareBreakdown.platformFee || 0,
      customerShare: fareBreakdown.customerShare || 0,
      providerShare: fareBreakdown.riderShare || 0,
      customerPays: totalAmount,
      providerReceives: fareBreakdown.riderReceives || totalAmount,
      platformReceives: fareBreakdown.platformFee || 0,
      totalAmount: totalAmount,
    },
    commission: {
      totalCommission: fareBreakdown.platformFee || 0,
      customerShare: fareBreakdown.customerShare || 0,
      providerShare: fareBreakdown.riderShare || 0,
      providerReceives: fareBreakdown.riderReceives || totalAmount,
    },
    customerPaid: totalAmount,
    providerReceives: fareBreakdown.riderReceives || totalAmount,
    relatedEntity: null,
    relatedEntityType: 'RideRequest',
    pendingRideData: {
      pickupLocation: storedPickup,
      dropoffLocation: storedDropoff,
      estimatedDistance: 0,
      rideType,
      selectedRiderId: riderId,
      fareBreakdown,
    },
  });

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new ResponseError('Customer not found', 404);
  }

  const stkPhone = phoneNumber || customer.phone;

  console.log('[initiateMpesaPayment] Initiating STK Push to:', stkPhone, 'Amount:', totalAmount);

  const suffix = transactionRef.split('-')[1] || transactionRef.slice(-8);
  const compliantAccountReference = `TXN${suffix}`;

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: stkPhone,
    amount: totalAmount,
    transactionRef: transactionRef,
    accountReference: compliantAccountReference,
    transactionDesc: 'Ride Payment',
  });

  if (!mpesaResponse.success) {
    transaction.status = 'failed';
    transaction.errorMessage = mpesaResponse.message;
    await transaction.save();

    // Log payment failure to SystemLog
    SystemLog.create({
      type: 'payment_failure',
      message: `Default STK Push initiation failed: ${mpesaResponse.message}`,
      details: { mpesaResponse, transactionRef, phoneNumber: stkPhone },
      user: customerId
    }).catch(e => console.error('Failed to log payment_failure in initiateMpesaPayment:', e.message));

    throw new ResponseError(mpesaResponse.message || 'STK Push failed', 400);
  }

  transaction.mpesaReceiptNumber = mpesaResponse.data?.CheckoutRequestID;
  transaction.darajaResponse = mpesaResponse.data;
  await transaction.save();

  res.status(200).json({
    success: true,
    message: 'STK Push initiated. Please check your phone to complete payment.',
    data: {
      transactionRef,
      checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
      amount: totalAmount,
      phone: stkPhone,
      fare: {
        baseFare: fareBreakdown.baseFare,
        totalFare: fareBreakdown.totalFare,
        platformFee: fareBreakdown.platformFee,
        customerShare: fareBreakdown.customerShare,
        riderShare: fareBreakdown.riderShare,
        riderReceives: fareBreakdown.riderReceives,
      },
    },
  });
});

/**
 * STEP 3: Verify M-Pesa payment status
 */
export const verifyMpesaPayment = asyncHandler(async (req, res) => {
  const { transactionRef } = req.params;

  console.log('[verifyMpesaPayment] Checking status:', transactionRef);

  const transaction = await Transaction.findOne({ transactionRef })
    .populate('customer', 'name email phone');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
  }

  if (transaction.customer._id.toString() !== req.user._id.toString()) {
    throw new ResponseError('You are not authorized to verify this payment', 403);
  }

  if (transaction.status === 'paid') {
    let rideRequest = await RideRequest.findOne({ transaction: transaction._id });
    if (!rideRequest && transaction.pendingRideData) {
      rideRequest = await createPaidRideRequest(transaction, transaction.pendingRideData, req);
    }
    return res.status(200).json({
      success: true,
      data: {
        transactionRef,
        status: 'SUCCESS',
        amount: transaction.amount.totalAmount,
        paidAt: transaction.paidAt,
        mpesaReceipt: transaction.mpesaReceiptNumber,
        ...(rideRequest && { rideRequest }),
      },
    });
  }

  if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    return res.status(200).json({
      success: true,
      data: {
        transactionRef,
        status: transaction.status === 'failed' ? 'FAILED' : 'CANCELLED',
        amount: transaction.amount.totalAmount,
      },
    });
  }

  const darajaResponse = await mpesaService.checkSTKStatus(transaction.mpesaReceiptNumber);
  const darajaResultCode = darajaResponse.data?.ResultCode;

  if (darajaResponse.success && Number(darajaResultCode) === 0) {
    transaction.status = 'paid';
    transaction.paidAt = new Date();
    transaction.darajaCallbackData = darajaResponse.data;
    await transaction.save();

    const pendingEntityData = transaction.pendingEntityData;
    if (transaction.type === 'order' && (transaction.relatedEntity || pendingEntityData)) {
      const orderId = transaction.relatedEntity || pendingEntityData?.entityId;
      const order = await handleOrderPaymentSuccess(transaction, orderId, req);

      if (order) {
        return res.status(200).json({
          success: true,
          data: {
            transactionRef,
            status: 'SUCCESS',
            amount: transaction.amount.totalAmount,
            paidAt: transaction.paidAt,
            mpesaReceipt: transaction.mpesaReceiptNumber,
            order,
          },
        });
      }
    }

    if (transaction.type === 'rental' && pendingEntityData) {
      const rentalResult = await handleRentalPaymentSuccess(transaction, pendingEntityData, req);
      if (rentalResult) {
        return res.status(200).json({
          success: true,
          data: {
            transactionRef,
            status: 'SUCCESS',
            amount: transaction.amount.totalAmount,
            paidAt: transaction.paidAt,
            mpesaReceipt: transaction.mpesaReceiptNumber,
            rental: rentalResult.rental,
          },
        });
      }
    }

    const pendingRideData = transaction.pendingRideData;
    if (pendingRideData && transaction.type !== 'order' && transaction.type !== 'rental') {
      const rideRequest = await createPaidRideRequest(transaction, pendingRideData, req);

      return res.status(200).json({
        success: true,
        data: {
          transactionRef,
          status: 'SUCCESS',
          amount: transaction.amount.totalAmount,
          paidAt: transaction.paidAt,
          mpesaReceipt: transaction.mpesaReceiptNumber,
          rideRequest: rideRequest,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transactionRef,
        status: 'SUCCESS',
        amount: transaction.amount.totalAmount,
        paidAt: transaction.paidAt,
        mpesaReceipt: transaction.mpesaReceiptNumber,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      transactionRef,
      status: 'PENDING',
      amount: transaction.amount.totalAmount,
    },
  });
});

/**
 * M-Pesa Daraja callback webhook
 */
export const mpesaCallback = asyncHandler(async (req, res) => {
  console.log('================ FULL MPESA CALLBACK ================');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('=====================================================');

  const payload = req.body;
  const callbackResult = mpesaService.processCallback(payload);

  if (!callbackResult.isValid) {
    console.error('[MPESA] Invalid callback format');
    return res.status(400).json({ success: false, message: 'Invalid callback format' });
  }

  const { checkoutRequestID, resultCode, mpesaReceiptNumber, merchantRequestID, transactionDate, phoneNumber, amount, resultDesc } = callbackResult.data;

  const isSuccess = Number(resultCode) === 0;

  if (!isSuccess) {
    console.log('[MPESA] Payment failed with ResultCode:', resultCode, 'Desc:', resultDesc);
  }

  const transaction = await Transaction.findOne({
    $or: [
      { mpesaReceiptNumber: checkoutRequestID },
      { checkoutRequestID: checkoutRequestID },
      { merchantRequestID: merchantRequestID },
      { mpesaReceiptNumber: mpesaReceiptNumber },
    ],
  }).populate('customer', 'name email phone');

  if (!transaction) {
    console.error('[MPESA] Transaction not found for CheckoutRequestID:', checkoutRequestID);
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  if (Number(resultCode) === 0) {
    transaction.status = 'paid';
    transaction.paymentStatus = 'paid';
    transaction.completedAt = new Date();
    transaction.paidAt = new Date();
    transaction.mpesaReceiptNumber = mpesaReceiptNumber;

    transaction.checkoutRequestID = checkoutRequestID;
    transaction.merchantRequestID = merchantRequestID;
    transaction.transactionDate = transactionDate;
    transaction.paidPhoneNumber = phoneNumber;
    transaction.paidAmount = amount;
    transaction.webhookData = payload;

    await transaction.save();
  }

  if (Number(resultCode) === 0 && transaction.status === 'paid') {
    const pendingEntityData = transaction.pendingEntityData;

    if (transaction.type === 'order' && (transaction.relatedEntity || pendingEntityData)) {
      if (pendingEntityData?.entityType === 'cart') {
        const { items, deliveryAddress, deliveryFee, businessId, paymentBreakdown } = pendingEntityData;

        if (!businessId) {
          console.error('[ORDER CREATION FAILED] Missing businessId in pendingEntityData');
          throw new Error('Business ID is required to create order');
        }

        const orderPayload = {
          customer: transaction.customer._id,
          business: businessId,
          items: items,
          totalAmount: paymentBreakdown.baseAmount,
          deliveryFee,
          discount: 0,
          finalAmount: paymentBreakdown.totalAmount,
          platformFee: paymentBreakdown.platformFee,
          orderType: 'marketplace',
          status: 'pending',
          paymentStatus: 'paid',
          paymentMethod: 'mpesa',
          deliveryAddress: {
            phone: deliveryAddress.phone,
            address: deliveryAddress.address,
            neighborhood: deliveryAddress.neighborhood || '',
            landmark: deliveryAddress.landmark || '',
          },
        };

        try {
          const order = new Order(orderPayload);
          const savedOrder = await order.save();

          transaction.relatedEntity = savedOrder._id;
          transaction.relatedEntityType = 'order';
          await transaction.save();

          await handleOrderPaymentSuccess(transaction, savedOrder._id, req);
        } catch (error) {
          console.error('[ORDER CREATION FAILED]', error);
          throw error;
        }
      } else {
        const orderId = transaction.relatedEntity || pendingEntityData?.entityId;
        await handleOrderPaymentSuccess(transaction, orderId, req);
      }
    }

    if (transaction.type === 'rental' && pendingEntityData) {
      if (pendingEntityData.isMonthlyRent || transaction.metadata?.isMonthlyRent) {
        await handleMonthlyRentPaymentSuccess(transaction, pendingEntityData, req);
      } else {
        await handleRentalPaymentSuccess(transaction, pendingEntityData, req);
      }
    }

    const pendingRideData = transaction.pendingRideData;
    if (pendingRideData && transaction.type !== 'order') {
      await createPaidRideRequest(transaction, pendingRideData, req);
    }

    try {
      await createPaymentNotification(transaction.customer, transaction, '/customer/rides', req);
    } catch (err) {
      console.error('[Payment notification failed]', err);
    }
  } else if (Number(resultCode) !== 0) {
    transaction.status = 'failed';
    transaction.paymentStatus = 'failed';
    transaction.resultCode = Number(resultCode);
    transaction.resultDesc = resultDesc || callbackResult.message;
    transaction.errorMessage = resultDesc || callbackResult.message;
    transaction.checkoutRequestID = checkoutRequestID;
    transaction.merchantRequestID = merchantRequestID;
    transaction.webhookData = payload;
    await transaction.save();

    // Log callback payment failure to SystemLog
    SystemLog.create({
      type: 'payment_failure',
      message: `M-Pesa STK Callback Payment failed: ${resultDesc || callbackResult.message}`,
      details: { callbackResult, payload, resultCode, resultDesc },
      user: transaction.customer?._id || transaction.customer
    }).catch(e => console.error('Failed to log payment_failure in mpesaCallback:', e.message));

    if (transaction.customer) {
      const notificationType = transaction.type === 'order' ? 'order_payment_failed' :
        transaction.type === 'rental' ? 'rental_payment_failed' : 'ride_payment_failed';
      const redirectPath = transaction.type === 'order' ? '/customer/orders' :
        transaction.type === 'rental' ? '/customer/bookings' : '/customer/rides';

      try {
        await createNotification(
          transaction.customer._id,
          notificationType,
          'Payment Failed',
          `Your M-Pesa payment of KSh ${transaction.amount.totalAmount} failed. ${resultDesc || callbackResult.message || 'Please try again.'}`,
          { transactionId: transaction._id },
          redirectPath,
          redirectPath,
          req
        );
      } catch (err) {
        console.error('[Payment failure notification failed]', err);
      }
    }
  }

  res.status(200).json({ success: true, message: 'Webhook processed' });
});

/**
 * Check payment status using Daraja STK status query
 */
export const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { transactionRef } = req.params;

  console.log('[STATUS ENDPOINT] Request received for transactionRef:', transactionRef);

  const transaction = await Transaction.findOne({ transactionRef })
    .populate('customer', 'name firstName lastName email phone avatar')
    .populate('provider', 'firstName lastName email phone');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
  }

  if (transaction.customer._id.toString() !== req.user._id.toString()) {
    throw new ResponseError('You are not authorized to verify this payment', 403);
  }

  if (transaction.status === 'completed' || transaction.status === 'paid') {
    let rideRequest = await RideRequest.findOne({ transaction: transaction._id });
    if (!rideRequest && transaction.pendingRideData) {
      rideRequest = await createPaidRideRequest(transaction, transaction.pendingRideData, req);
    }
    return res.status(200).json({
      success: true,
      data: {
        transactionRef: transaction.transactionRef,
        status: transaction.status,
        paymentStatus: transaction.paymentStatus,
        amount: transaction.amount.totalAmount,
        paidAt: transaction.paidAt,
        completedAt: transaction.completedAt,
        mpesaReceipt: transaction.mpesaReceiptNumber,
        ...(rideRequest && { rideRequest }),
      },
    });
  }

  if (transaction.status === 'failed') {
    return res.status(200).json({
      success: true,
      data: {
        transactionRef: transaction.transactionRef,
        status: 'FAILED',
        amount: transaction.amount.totalAmount,
        errorMessage: transaction.errorMessage,
      },
    });
  }

  const darajaResponse = await mpesaService.checkSTKStatus(transaction.mpesaReceiptNumber);
  const resultCode = darajaResponse.data?.ResultCode;
  const isSuccess = Number(resultCode) === 0;

  const freshTransaction = await Transaction.findById(transaction._id);
  if (freshTransaction && (freshTransaction.status === 'paid' || freshTransaction.status === 'completed')) {
    let rideRequest = await RideRequest.findOne({ transaction: freshTransaction._id });
    if (!rideRequest && freshTransaction.pendingRideData) {
      rideRequest = await createPaidRideRequest(freshTransaction, freshTransaction.pendingRideData, req);
    }
    return res.status(200).json({
      success: true,
      data: {
        transactionRef: freshTransaction.transactionRef,
        status: freshTransaction.status,
        paymentStatus: freshTransaction.paymentStatus,
        amount: freshTransaction.amount.totalAmount,
        paidAt: freshTransaction.paidAt,
        completedAt: freshTransaction.completedAt,
        mpesaReceipt: freshTransaction.mpesaReceiptNumber,
        ...(rideRequest && { rideRequest }),
      },
    });
  }

  if (darajaResponse.success && isSuccess) {
    transaction.status = 'paid';
    transaction.paymentStatus = 'paid';
    transaction.completedAt = new Date();
    transaction.paidAt = new Date();
    transaction.mpesaReceiptNumber = darajaResponse.data?.mpesaReceiptNumber || transaction.mpesaReceiptNumber;
    await transaction.save();

    if (transaction.type !== 'ride' && transaction.provider && transaction.providerReceives > 0) {
      await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'payment_status_poll');
    }

    let rideRequest = null;
    if (transaction.type === 'ride' && transaction.pendingRideData) {
      rideRequest = await createPaidRideRequest(transaction, transaction.pendingRideData, req);
    }

    const customerNavTarget = transaction.type === 'order' ? '/customer/orders' :
      transaction.type === 'rental' ? '/customer/rentals' : '/customer/rides';
    await createPaymentNotification(transaction.customer, transaction, customerNavTarget, req);

    if (transaction.provider) {
      const providerNavTarget = transaction.type === 'order' ? '/business/orders' :
        transaction.type === 'rental' ? '/landlord/bookings' : '/rider/rides';
      await createPaymentNotification(transaction.provider, transaction, providerNavTarget, req);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed',
      data: {
        transactionRef: transaction.transactionRef,
        status: 'paid',
        paymentStatus: 'paid',
        amount: transaction.amount.totalAmount,
        paidAt: transaction.paidAt,
        ...(rideRequest && { rideRequest }),
      },
    });
  } else {
    const numericCode = Number(resultCode);

    if (numericCode === 4999) {
      return res.status(200).json({
        success: true,
        data: {
          transactionRef: transaction.transactionRef,
          status: 'pending',
          paymentStatus: 'pending',
          amount: transaction.amount.totalAmount,
        },
      });
    }

    if (darajaResponse.success && resultCode !== undefined && Number.isFinite(numericCode) && numericCode !== 0) {
      const currentStatus = await Transaction.findById(transaction._id, 'status');
      if (currentStatus && currentStatus.status !== 'paid' && currentStatus.status !== 'completed') {
        transaction.status = 'failed';
        transaction.errorMessage = darajaResponse.data?.ResultDesc;
        await transaction.save();

        // Log polled payment failure to SystemLog
        SystemLog.create({
          type: 'payment_failure',
          message: `M-Pesa Polled Payment failed: ${darajaResponse.data?.ResultDesc}`,
          details: { darajaResponse, transactionRef },
          user: transaction.customer?._id || transaction.customer
        }).catch(e => console.error('Failed to log payment_failure in checkPaymentStatus:', e.message));
      }

      return res.status(200).json({
        success: true,
        data: {
          transactionRef: transaction.transactionRef,
          status: transaction.status,
          amount: transaction.amount.totalAmount,
          reason: darajaResponse.data?.ResultDesc,
        },
      });
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      transactionRef: transaction.transactionRef,
      status: 'PENDING',
      amount: transaction.amount.totalAmount,
    },
  });
});

/**
 * Initialize a payment for an order or rental
 */
export const initiatePayment = asyncHandler(async (req, res) => {
  const {
    entityType,
    entityId,
    deliveryFee = 0,
    phoneNumber,
    items,
    deliveryAddress,
  } = req.body;

  console.log('[initiatePayment] INITIATING PAYMENT', req.body);

  const customerId = req.user._id;
  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  const phoneRegex = /^254(7|8|9|1)\d{8}$/;
  if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 9 && /^[7891]/.test(cleaned)) {
      cleaned = '254' + cleaned;
    }

    if (!phoneRegex.test(cleaned)) {
      throw new ResponseError('Invalid phone number. Use format: 2547XXXXXXXX or 07XXXXXXXX', 400);
    }
  }

  if (entityType?.toLowerCase() === 'cart') {
    if (!items || items.length === 0) {
      throw new ResponseError('Cart items are required for cart-based payment', 400);
    }

    if (!deliveryAddress || !deliveryAddress.address || !deliveryAddress.phone) {
      throw new ResponseError('Delivery address and phone are required', 400);
    }

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new ResponseError(`Product ${item.product} not found`, 404);
      }
      if (product.isActive === false) {
        throw new ResponseError(`Product "${product.name}" is currently unavailable`, 400);
      }

      const productBaseStock = (product.stock !== undefined && product.stock !== null)
        ? Number(product.stock)
        : (Number(product.stockCount) || 0);

      // Match variant
      let matchedVariant = null;
      if (product.variants && product.variants.length > 0) {
        if (item.variantId) {
          matchedVariant = product.variants.id?.(item.variantId) || product.variants.find(v => v._id?.toString() === item.variantId?.toString());
        }
        if (!matchedVariant && item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
          matchedVariant = product.variants.find(v => {
            if (v.options && typeof v.options === 'object') {
              const opts = v.options instanceof Map ? Object.fromEntries(v.options) : v.options;
              return Object.entries(item.selectedOptions).every(([k, val]) => opts[k] === val);
            }
            if (v.name && v.value) {
              return item.selectedOptions[v.name] === v.value;
            }
            return false;
          });
        }
        if (!matchedVariant && item.variant) {
          matchedVariant = product.variants.find(v => v.name === item.variant || v.value === item.variant);
        }
      }

      if (matchedVariant) {
        if (matchedVariant.isActive === false || matchedVariant.isAvailable === false) {
          throw new ResponseError(`Selected variant "${matchedVariant.name || matchedVariant.value}" is currently unavailable`, 400);
        }
      }

      let availableStock = productBaseStock;
      if (matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock !== null) {
        availableStock = Number(matchedVariant.stock);
      }

      if (availableStock < item.quantity) {
        throw new ResponseError(
          availableStock <= 0
            ? `"${product.name}${matchedVariant ? ` (${matchedVariant.name || matchedVariant.value})` : ''}" is out of stock`
            : `Insufficient stock for "${product.name}${matchedVariant ? ` (${matchedVariant.name || matchedVariant.value})` : ''}". Available: ${availableStock}`,
          400
        );
      }

      let itemBasePrice = product.price;
      if (matchedVariant) {
        if (matchedVariant.price !== undefined && matchedVariant.price !== null && matchedVariant.price > 0) {
          itemBasePrice = Number(matchedVariant.price);
        } else if (matchedVariant.priceAdjustment) {
          itemBasePrice = product.price + Number(matchedVariant.priceAdjustment);
        }
      }

      let addOnsTotal = 0;
      const verifiedAddOns = [];
      if (item.selectedAddOns && Array.isArray(item.selectedAddOns)) {
        if (product.maxAddOnsSelectable && item.selectedAddOns.length > product.maxAddOnsSelectable) {
          throw new ResponseError(`Cannot select more than ${product.maxAddOnsSelectable} add-ons for "${product.name}"`, 400);
        }
        for (const clientAddOn of item.selectedAddOns) {
          const officialAddOn = product.addOns?.find(
            (a) => a.name.toLowerCase().trim() === (clientAddOn.name || '').toLowerCase().trim()
          );
          if (officialAddOn) {
            if (officialAddOn.isActive === false || officialAddOn.isAvailable === false) {
              throw new ResponseError(`Add-on "${officialAddOn.name}" is currently unavailable`, 400);
            }
            const price = Number(officialAddOn.price) || 0;
            addOnsTotal += price;
            verifiedAddOns.push({ name: officialAddOn.name, price });
          }
        }
      }

      const itemUnitPrice = itemBasePrice + addOnsTotal;
      const itemTotal = itemUnitPrice * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: itemUnitPrice,
        variant: matchedVariant ? (matchedVariant.name || matchedVariant.value || item.variant) : (item.variant || ''),
        variantId: matchedVariant?._id,
        selectedOptions: item.selectedOptions || {},
        selectedAddOns: verifiedAddOns,
        selectedVariations: item.selectedVariations || item.selectedOptions || {},
        addOnsTotal,
        image: (matchedVariant?.image) || product.images?.[0],
      });
    }

    const paymentBreakdown = calculateShoppingPayment(totalAmount, deliveryFee);
    const finalAmount = paymentBreakdown.customerPays;

    const firstProduct = await Product.findById(validatedItems[0].product);
    const businessId = firstProduct?.business;

    if (!businessId) {
      throw new ResponseError('Product has no associated business. Cannot process payment.', 400);
    }

    const transaction = await Transaction.create({
      transactionRef,
      type: 'order',
      customer: customerId,
      provider: businessId,
      status: 'pending',
      amount: {
        baseAmount: totalAmount,
        deliveryFee,
        platformFee: paymentBreakdown.platformFee,
        customerShare: paymentBreakdown.customerShare,
        providerShare: paymentBreakdown.providerShare,
        customerPays: paymentBreakdown.customerPays,
        providerReceives: paymentBreakdown.providerReceives,
        platformReceives: paymentBreakdown.platformReceives,
        totalAmount: finalAmount,
      },
      commission: {
        totalCommission: paymentBreakdown.platformFee,
        customerShare: paymentBreakdown.customerShare,
        providerShare: paymentBreakdown.providerShare,
        providerReceives: paymentBreakdown.providerReceives,
      },
      customerPaid: finalAmount,
      providerReceives: paymentBreakdown.providerReceives,
      relatedEntity: null,
      relatedEntityType: 'order',
      pendingEntityData: {
        entityType: 'cart',
        items: validatedItems,
        deliveryAddress,
        deliveryFee,
        businessId,
        paymentBreakdown: {
          baseAmount: totalAmount,
          deliveryFee,
          platformFee: paymentBreakdown.platformFee,
          customerShare: paymentBreakdown.customerShare,
          providerShare: paymentBreakdown.providerShare,
          customerPays: paymentBreakdown.customerPays,
          providerReceives: paymentBreakdown.providerReceives,
          platformReceives: paymentBreakdown.platformReceives,
          totalAmount: finalAmount,
        },
      },
    });

    const customer = await User.findById(customerId);
    const stkPhone = phoneNumber || customer.phone;

    const suffix = transactionRef.split('-')[1] || transactionRef.slice(-8);
    const compliantAccountReference = `TXN${suffix}`;

    const mpesaResponse = await mpesaService.initiateSTKPush({
      phoneNumber: stkPhone,
      amount: finalAmount,
      transactionRef: transactionRef,
      accountReference: compliantAccountReference,
      transactionDesc: 'Order Payment',
    });

    if (!mpesaResponse.success) {
      transaction.status = 'failed';
      await transaction.save();

      // Log payment failure to SystemLog
      SystemLog.create({
        type: 'payment_failure',
        message: `Cart payment STK push failed: ${mpesaResponse.message}`,
        details: { mpesaResponse, transactionRef, phoneNumber: stkPhone },
        user: customerId
      }).catch(e => console.error('Failed to log payment_failure in initiatePayment:', e.message));

      throw new ResponseError(mpesaResponse.message, 400);
    }

    transaction.mpesaReceiptNumber = mpesaResponse.data?.CheckoutRequestID;
    transaction.darajaResponse = mpesaResponse.data;
    await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'STK Push initiated. Please check your phone to complete payment.',
      data: {
        transactionRef: transaction.transactionRef,
        checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
        amount: finalAmount,
        phone: stkPhone,
        paymentBreakdown: {
          basePrice: totalAmount,
          deliveryFee,
          platformFee: paymentBreakdown.platformFee,
          customerShare: paymentBreakdown.customerShare,
          providerShare: paymentBreakdown.providerShare,
          customerPays: paymentBreakdown.customerPays,
          providerReceives: paymentBreakdown.providerReceives,
          totalAmount: finalAmount,
        },
      },
    });
  }

  let entity;
  let providerId;
  let entityTypeLower;

  switch (entityType?.toLowerCase()) {
    case 'order':
      entity = await Order.findById(entityId).populate('items.product');
      if (!entity) throw new ResponseError('Order not found', 404);
      providerId = entity.business;
      entityTypeLower = 'order';
      break;
    case 'rental':
      entity = await Rental.findById(entityId);
      if (!entity) throw new ResponseError('Rental not found', 404);
      providerId = entity.landlord;
      entityTypeLower = 'rental';
      break;
    default:
      throw new ResponseError('Invalid entity type. Use: order, rental, or cart', 400);
  }

  if (entity.status === 'paid' || entity.status === 'completed') {
    throw new ResponseError(`${entityType} is already paid`, 400);
  }

  let totalAmount;
  let paymentBreakdown;
  let baseAmount;

  if (entityTypeLower === 'order' && entity.finalAmount !== undefined) {
    totalAmount = entity.finalAmount;
    baseAmount = entity.totalAmount || 0;
    paymentBreakdown = calculateShoppingPayment(baseAmount, entity.deliveryFee || 0);
  } else if (entityTypeLower === 'rental') {
    baseAmount = entity.monthlyPrice || 0;
    paymentBreakdown = calculateRentalPayment(baseAmount, 1);
    totalAmount = paymentBreakdown.customerPays;
  } else {
    baseAmount = entity.finalAmount || entity.totalAmount || entity.totalPrice || entity.price || entity.estimatedPrice || 0;
    paymentBreakdown = calculatePayment(baseAmount, deliveryFee);
    totalAmount = paymentBreakdown.customerPays;
  }

  const transaction = await Transaction.create({
    transactionRef,
    type: entityTypeLower,
    customer: customerId,
    provider: providerId,
    status: 'pending',
    amount: {
      baseAmount: baseAmount,
      deliveryFee,
      platformFee: paymentBreakdown.platformFee,
      customerShare: paymentBreakdown.customerShare,
      providerShare: paymentBreakdown.providerShare,
      customerPays: paymentBreakdown.customerPays,
      providerReceives: paymentBreakdown.providerReceives,
      platformReceives: paymentBreakdown.platformReceives,
      totalAmount: totalAmount,
    },
    commission: {
      totalCommission: paymentBreakdown.platformFee,
      customerShare: paymentBreakdown.customerShare,
      providerShare: paymentBreakdown.providerShare,
      providerReceives: paymentBreakdown.providerReceives,
    },
    customerPaid: totalAmount,
    providerReceives: paymentBreakdown.providerReceives,
    relatedEntity: null,
    relatedEntityType: entityTypeLower,
    pendingEntityData: {
      entityId,
      entityType,
      deliveryFee,
      paymentBreakdown: {
        baseAmount: baseAmount,
        deliveryFee,
        platformFee: paymentBreakdown.platformFee,
        customerShare: paymentBreakdown.customerShare,
        providerShare: paymentBreakdown.providerShare,
        customerPays: paymentBreakdown.customerPays,
        providerReceives: paymentBreakdown.providerReceives,
        platformReceives: paymentBreakdown.platformReceives,
        totalAmount: totalAmount,
      },
    },
  });

  const customer = await User.findById(customerId);
  const stkPhone = phoneNumber || customer.phone;

  const suffix = transactionRef.split('-')[1] || transactionRef.slice(-8);
  const compliantAccountReference = `TXN${suffix}`;
  const compliantDesc = entityTypeLower === 'rental' ? 'Rent Payment' : 'Order Payment';

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: stkPhone,
    amount: totalAmount,
    transactionRef: transactionRef,
    accountReference: compliantAccountReference,
    transactionDesc: compliantDesc,
  });

  if (!mpesaResponse.success) {
    transaction.status = 'failed';
    await transaction.save();

    // Log payment failure to SystemLog
    SystemLog.create({
      type: 'payment_failure',
      message: `Existing payment STK push failed: ${mpesaResponse.message}`,
      details: { mpesaResponse, transactionRef, phoneNumber: stkPhone },
      user: customerId
    }).catch(e => console.error('Failed to log payment_failure in initiatePayment (existing):', e.message));

    throw new ResponseError(mpesaResponse.message, 400);
  }

  transaction.mpesaReceiptNumber = mpesaResponse.data?.CheckoutRequestID;
  transaction.darajaResponse = mpesaResponse.data;
  await transaction.save();

  res.status(200).json({
    success: true,
    message: 'STK Push initiated. Please check your phone to complete payment.',
    data: {
      transactionRef: transaction.transactionRef,
      checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
      amount: totalAmount,
      phone: stkPhone,
      paymentBreakdown: {
        basePrice: baseAmount,
        deliveryFee,
        platformFee: paymentBreakdown.platformFee,
        customerShare: paymentBreakdown.customerShare,
        providerShare: paymentBreakdown.providerShare,
        customerPays: paymentBreakdown.customerPays,
        providerReceives: paymentBreakdown.providerReceives,
        totalAmount: totalAmount,
      },
    },
  });
});

/**
 * Complete a transaction
 */
export const completeTransaction = asyncHandler(async (req, res) => {
  const { transactionRef } = req.params;
  const userId = req.user._id;

  const transaction = await Transaction.findOne({ transactionRef })
    .populate('customer')
    .populate('provider');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
  }

  if (transaction.customer._id.toString() !== userId.toString()) {
    throw new ResponseError('Only the customer can confirm completion', 403);
  }

  if (transaction.status !== 'paid') {
    throw new ResponseError('Payment must be confirmed before completion', 400);
  }

  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transaction.save();

  if (transaction.provider && transaction.providerReceives > 0) {
    await releaseEscrow(transaction.provider, transaction.providerReceives, 'transaction_complete');
  }

  const entityType = normalizeEntityType(transaction.relatedEntityType);
  switch (entityType) {
    case 'order':
      await Order.findByIdAndUpdate(transaction.relatedEntity, {
        status: 'completed',
        deliveredAt: new Date(),
      });
      break;
    case 'rental':
      await Rental.findByIdAndUpdate(transaction.relatedEntity, {
        status: 'completed',
        isAvailable: false,
        bookedAt: new Date(),
      });
      break;
    case 'ride':
      await RideRequest.findByIdAndUpdate(transaction.relatedEntity, {
        status: 'completed',
        completedAt: new Date(),
      });
      break;
  }

  const customerNavTarget = transaction.type === 'order' ? '/customer/orders' :
    transaction.type === 'rental' ? '/customer/rentals' : '/customer/rides';
  await createPaymentNotification(transaction.customer, transaction, customerNavTarget, req);

  res.status(200).json({
    success: true,
    message: 'Transaction completed successfully. Funds have been added to provider wallet.',
    data: {
      transactionRef: transaction.transactionRef,
      status: transaction.status,
      completedAt: transaction.completedAt,
      providerReceives: transaction.providerReceives,
    },
  });
});

/**
 * Get transaction history for a user
 */
export const getTransactionHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, type, page = 1, limit = 10 } = req.query;

  const query = {
    $or: [{ customer: userId }, { provider: userId }],
  };

  if (status) query.status = status;
  if (type) query.type = type;

  const transactions = await Transaction.find(query)
    .populate('customer', 'firstName lastName email')
    .populate('provider', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Transaction.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    },
  });
});

/**
 * Get single transaction details
 */
export const getTransaction = asyncHandler(async (req, res) => {
  const { transactionRef } = req.params;

  const transaction = await Transaction.findOne({ transactionRef })
    .select('-darajaResponse -darajaCallbackData -webhookData')
    .populate('customer', 'firstName lastName email phone')
    .populate('provider', 'firstName lastName email phone');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
  }

  // Ensure only transaction participants or an admin can view details
  const customerId = (transaction.customer?._id || transaction.customer)?.toString();
  const providerId = (transaction.provider?._id || transaction.provider)?.toString();

  if (
    customerId !== req.user._id.toString() &&
    providerId !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ResponseError('Not authorized to access this transaction details', 403);
  }

  res.status(200).json({
    success: true,
    data: transaction,
  });
});

/**
 * Get wallet balance and summary
 */
export const getWalletSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await Wallet.create({
      user: userId,
      balance: 0,
      pendingBalance: 0,
    });
  }

  const completedTransactions = await Transaction.find({
    provider: userId,
    status: 'completed',
  }).select('providerReceives commission totalCommission');

  const totalEarnings = completedTransactions.reduce((sum, t) => sum + t.providerReceives, 0);
  const totalCommissionPaid = completedTransactions.reduce((sum, t) => sum + t.commission.providerShare, 0);

  res.status(200).json({
    success: true,
    data: {
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      totalEarnings: wallet.totalEarnings || totalEarnings,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      totalCommissionPaid: wallet.totalCommissionPaid || totalCommissionPaid,
      isVerified: wallet.isVerified,
    },
  });
});
