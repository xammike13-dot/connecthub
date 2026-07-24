import { v4 as uuidv4 } from 'uuid';
import mpesaService from '../services/mpesaService.js';
import { calculatePayment, calculateShoppingPayment, calculateRentalPayment } from '../utils/paymentCalculator.js';
import { calculateFare, calculateFareWithRiderRate, isNightRate } from '../utils/rideFareCalculator.js';
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

const normalizeEntityType = (type) => {
  const lower = String(type || '').toLowerCase();
  if (lower === 'order') return 'order';
  if (lower === 'rental') return 'rental';
  if (lower === 'ride' || lower === 'riderequest') return 'ride';
  return lower;
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

  // Only update payment-related fields, do NOT change order status
  // Order status should remain 'pending' (waiting for business to accept)
  order.paymentStatus = 'paid';
  order.paymentId = transaction.mpesaReceiptNumber;
  order.mpesaReceiptNumber = transaction.mpesaReceiptNumber;
  order.transaction = transaction._id;
  // order.status = 'paid'; // REMOVED: Don't change order status
  await order.save();

  // Reload order to verify save
  const updatedOrder = await Order.findById(order._id);
  console.log('[ORDER AFTER SAVE]', {
    paymentStatus: updatedOrder.paymentStatus,
    status: updatedOrder.status
  });

  const businessId = order.business?._id || order.business;
  const providerAmount = transaction.providerReceives || order.finalAmount || 0;
  if (businessId && providerAmount > 0) {
    await creditPendingEscrow(businessId, providerAmount, 'marketplace_payment');
  }

  // Transaction is already linked in the callback, skip redundant linking
  // transaction.relatedEntity = order._id;
  // transaction.relatedEntityType = 'order';
  // await transaction.save();

  const io = req?.app?.get('io');
  if (io && businessId) {
    console.log('[EMITTING NEW ORDER]', {
      businessId,
      orderId: order._id,
      room: `business_${businessId}`
    });

    io.to(`business_${businessId}`).emit('new_order', {
      orderId: order._id,
      customer: transaction.customer,
      items: order.items,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      paymentStatus: order.paymentStatus,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
    });

    console.log('[EMITTING CUSTOMER UPDATE]', {
      customerId: order.customer,
      orderId: order._id,
      room: `user_${order.customer}`,
      status: order.status
    });

    io.to(`user_${order.customer}`).emit('order_created', {
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });

    console.log('[SOCKET EVENTS EMITTED]');

    try {
      await createNotification(
        businessId,
        'new_order',
        'New Paid Order Received',
        `You have a new paid order #${order._id.toString().slice(-6).toUpperCase()} from ${transaction.customer?.name || 'a customer'}. Amount: KSh ${order.finalAmount}.`,
        { orderId: order._id, customerId: transaction.customer._id, amount: order.finalAmount },
        `/business/orders/${order._id}`,
        '/business/orders',
        req,
        'business'
      );
    } catch (err) {
      console.error('[Order notification failed]', err);
    }
  }

  try {
    await createNotification(
      transaction.customer._id,
      'order_payment_confirmed',
      'Order Payment Confirmed',
      `Your payment of KSh ${transaction.amount.totalAmount} for order #${order._id.toString().slice(-6).toUpperCase()} has been confirmed. The business has been notified.`,
    { orderId: order._id, transactionId: transaction._id },
    `/customer/orders/${order._id}`,
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
  booking.transaction = transaction._id;
  booking.escrowStatus = 'held'; // Money held in escrow until move-in confirmed
  booking.fundsReleased = false;

  await rental.save();

  console.log('[RENTAL PAYMENT SUCCESS] Booking updated:', {
    bookingId: booking._id,
    rentalId: rental._id,
    customerId,
    paymentStatus: booking.paymentStatus,
    status: booking.status,
    escrowStatus: booking.escrowStatus,
    bookingStartDate: booking.bookingStartDate,
    nextRentDueDate: booking.nextRentDueDate,
  });

  // Credit pending escrow to landlord wallet
  const landlordId = rental.landlord?._id || rental.landlord;
  const providerReceives = transaction.providerReceives || booking.landlordReceives || booking.totalPrice;

  if (landlordId && providerReceives > 0) {
    await creditPendingEscrow(landlordId, providerReceives, 'rental_payment');
    console.log('[RENTAL PAYMENT SUCCESS] Credited pending escrow:', { landlordId, amount: providerReceives });
  }

  console.log('[RENTAL PAYMENT SUCCESS] Money held in escrow until move-in confirmation');

  transaction.relatedEntity = rental._id;
  transaction.relatedEntityType = 'rental';
  await transaction.save();

  const io = req?.app?.get('io');
  if (io && landlordId) {
    try {
      await createNotification(
        landlordId,
        'new_booking',
        'New Rental Booking Received',
        `You have a new paid booking for ${rental.rentalName}. Amount: KSh ${transaction.amount.totalAmount}. Please accept or decline this booking.`,
        { rentalId: rental._id, bookingId: booking?._id },
        `/landlord/dashboard`,
        '/landlord/bookings',
        req,
        'landlord'
      );
    } catch (err) {
      console.error('[Landlord booking notification failed]', err);
    }

    io.to(`user_${landlordId}`).emit('new_booking', {
      rentalId: rental._id,
      bookingId: booking?._id,
      message: 'New rental booking received. Please accept or decline.',
      action: 'accept_decline',
    });
  }

  try {
    await createNotification(
      customerId,
      'order_payment_confirmed',
    'Rental Payment Confirmed',
    `Your payment of KSh ${transaction.amount.totalAmount} for ${rental.rentalName} has been confirmed. Your booking is pending landlord acceptance.`,
    { rentalId: rental._id, transactionId: transaction._id },
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
 * STEP 1: Calculate fare estimate for ride booking
 */
export const calculateRideFareEstimate = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation } = req.body;

  console.log('[calculateRideFareEstimate] Request:', { pickupLocation, dropoffLocation });

  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);
  const fareBreakdown = calculateFare(distanceInMeters, 60);

  console.log('[calculateRideFareEstimate] Fare calculated:', fareBreakdown);

  res.status(200).json({
    success: true,
    data: {
      distanceInMeters: Math.round(distanceInMeters),
      distanceInKm: Math.round(distanceInMeters / 1000 * 100) / 100,
      ...fareBreakdown,
    },
  });
});

/**
 * Initiate M-Pesa STK Push with specific rider
 */
export const initiateMpesaPaymentWithRider = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const {
    pickupLocation,
    dropoffLocation,
    phoneNumber,
    riderId,
    rideType = 'bodaboda'
  } = req.body;

  console.log('[initiateMpesaPaymentWithRider] Starting payment flow:', {
    customerId,
    pickupLocation: pickupLocation?.address || pickupLocation?.name,
    dropoffLocation: dropoffLocation?.address || dropoffLocation?.name,
    phoneNumber,
    riderId,
  });

  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  if (!riderId) {
    throw new ResponseError('Selected rider ID is required', 400);
  }

  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  const rider = await User.findById(riderId);
  if (!rider) {
    throw new ResponseError('Selected rider not found', 404);
  }

  if (rider.role !== 'rider') {
    throw new ResponseError('Selected user is not a rider', 400);
  }

  const dayRate = rider.riderProfile?.dayRatePerKm;
  const nightRate = rider.riderProfile?.nightRatePerKm;

  if (!dayRate || !nightRate || isNaN(dayRate) || isNaN(nightRate) || dayRate <= 0 || nightRate <= 0) {
    throw new ResponseError('Rider has not configured day/night rates', 400);
  }

  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);
  const distanceInKm = Math.round(distanceInMeters / 1000 * 100) / 100;

  const isNight = isNightTime();
  console.log('[initiateMpesaPaymentWithRider] Time check:', { hour: new Date().getHours(), isNight });

  const fareBreakdown = calculateFareWithRiderRate(distanceInMeters, dayRate, nightRate);
  const totalAmount = fareBreakdown.totalFare;

  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

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
      platformFee: fareBreakdown.platformFee,
      customerShare: fareBreakdown.customerShare,
      providerShare: fareBreakdown.riderShare,
      customerPays: fareBreakdown.customerPays,
      providerReceives: fareBreakdown.riderReceives,
      platformReceives: fareBreakdown.platformFee,
      totalAmount: totalAmount,
    },
    commission: {
      totalCommission: fareBreakdown.platformFee,
      customerShare: fareBreakdown.customerShare,
      providerShare: fareBreakdown.riderShare,
      providerReceives: fareBreakdown.riderReceives,
    },
    customerPaid: totalAmount,
    providerReceives: fareBreakdown.riderReceives,
    relatedEntity: null,
    relatedEntityType: 'RideRequest',
    pendingRideData: {
      pickupLocation,
      dropoffLocation,
      estimatedDistance: distanceInKm,
      rideType,
      selectedRiderId: riderId,
      fareBreakdown: {
        baseFare: fareBreakdown.baseFare,
        totalFare: fareBreakdown.totalFare,
        platformFee: fareBreakdown.platformFee,
        customerShare: fareBreakdown.customerShare,
        riderShare: fareBreakdown.riderShare,
        riderReceives: fareBreakdown.riderReceives,
        ratePerKm: fareBreakdown.ratePerKm,
        distanceInKm: fareBreakdown.distanceInKm,
        appliedRule: fareBreakdown.appliedRule,
        riderId: riderId,
        riderDayRate: dayRate,
        riderNightRate: nightRate,
        isNightRate: isNight,
      },
    },
  };

  const transaction = await Transaction.create(transactionPayload);

  console.log('[initiateMpesaPaymentWithRider] Transaction created:', transactionRef);

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new ResponseError('Customer not found', 404);
  }

  const stkPhone = phoneNumber || customer.phone;

  console.log('[initiateMpesaPaymentWithRider] Initiating STK Push to:', stkPhone, 'Amount:', totalAmount);

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: stkPhone,
    amount: totalAmount,
    transactionRef: transactionRef,
    accountReference: `RIDE-${transactionRef}`,
    transactionDesc: 'Bodaboda ride payment',
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
export const initiateMpesaPayment = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const {
    pickupLocation,
    dropoffLocation,
    phoneNumber,
    rideType = 'bodaboda'
  } = req.body;

  console.log('[initiateMpesaPayment] Starting payment flow:', {
    customerId,
    pickupLocation: pickupLocation?.address || pickupLocation?.name,
    dropoffLocation: dropoffLocation?.address || dropoffLocation?.name,
    phoneNumber,
  });

  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);
  const distanceInKm = Math.round(distanceInMeters / 1000 * 100) / 100;

  const isNight = isNightTime();
  console.log('[initiateMpesaPayment] Time check:', { hour: new Date().getHours(), isNight });

  const fareBreakdown = calculateFare(distanceInMeters, 60);
  const totalAmount = fareBreakdown.totalFare;

  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  const transaction = await Transaction.create({
    transactionRef,
    type: 'ride',
    customer: customerId,
    provider: null,
    status: 'pending',
    amount: {
      baseAmount: fareBreakdown.baseFare,
      deliveryFee: 0,
      platformFee: fareBreakdown.platformFee,
      customerShare: fareBreakdown.customerShare,
      providerShare: fareBreakdown.riderShare,
      customerPays: fareBreakdown.customerPays,
      providerReceives: fareBreakdown.riderReceives,
      platformReceives: fareBreakdown.platformFee,
      totalAmount: totalAmount,
    },
    commission: {
      totalCommission: fareBreakdown.platformFee,
      customerShare: fareBreakdown.customerShare,
      providerShare: fareBreakdown.riderShare,
      providerReceives: fareBreakdown.riderReceives,
    },
    customerPaid: totalAmount,
    providerReceives: fareBreakdown.riderReceives,
    relatedEntity: null,
    relatedEntityType: 'RideRequest',
    pendingRideData: {
      pickupLocation,
      dropoffLocation,
      estimatedDistance: distanceInKm,
      rideType,
      fareBreakdown: {
        baseFare: fareBreakdown.baseFare,
        totalFare: fareBreakdown.totalFare,
        platformFee: fareBreakdown.platformFee,
        customerShare: fareBreakdown.customerShare,
        riderShare: fareBreakdown.riderShare,
        riderReceives: fareBreakdown.riderReceives,
        ratePerKm: fareBreakdown.ratePerKm,
        distanceInKm: fareBreakdown.distanceInKm,
        appliedRule: fareBreakdown.appliedRule,
      },
    },
  });

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new ResponseError('Customer not found', 404);
  }

  const stkPhone = phoneNumber || customer.phone;

  console.log('[initiateMpesaPayment] Initiating STK Push to:', stkPhone, 'Amount:', totalAmount);

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: stkPhone,
    amount: totalAmount,
    transactionRef: transactionRef,
    accountReference: `RIDE-${transactionRef}`,
    transactionDesc: 'Bodaboda ride payment',
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

  if (transaction.status === 'paid') {
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
      const selectedRiderId = pendingRideData.selectedRiderId;

      const formatCoordinates = (loc) => {
        if (!loc) return [];
        if (Array.isArray(loc.coordinates)) {
          return loc.coordinates;
        }
        if (loc.coordinates && Array.isArray(loc.coordinates.coordinates)) {
          return loc.coordinates.coordinates;
        }
        return [];
      };

      const formattedPickup = {
        name: pendingRideData.pickupLocation?.name || pendingRideData.pickupLocation?.address || 'Pickup Location',
        address: pendingRideData.pickupLocation?.address || pendingRideData.pickupLocation?.name || 'Pickup Location',
        landmark: pendingRideData.pickupLocation?.landmark,
        coordinates: formatCoordinates(pendingRideData.pickupLocation),
      };

      const formattedDropoff = {
        name: pendingRideData.dropoffLocation?.name || pendingRideData.dropoffLocation?.address || 'Dropoff Location',
        address: pendingRideData.dropoffLocation?.address || pendingRideData.dropoffLocation?.name || 'Dropoff Location',
        landmark: pendingRideData.dropoffLocation?.landmark,
        coordinates: formatCoordinates(pendingRideData.dropoffLocation),
      };

      const ridePayload = {
        customer: transaction.customer._id,
        pickupLocation: formattedPickup,
        dropoffLocation: formattedDropoff,
        estimatedDistance: pendingRideData.estimatedDistance,
        rideType: pendingRideData.rideType || 'bodaboda',
        passengers: 1,
        status: 'waiting_rider',
        paymentStatus: 'paid',
        paymentMethod: 'mpesa',
        transaction: transaction._id,
        fare: pendingRideData.fareBreakdown,
        escrowStatus: 'held',
        fundsReleased: false,
        ...(selectedRiderId && { rider: selectedRiderId }),
      };

      const existingRide = await RideRequest.findOne({ transaction: transaction._id });
      if (existingRide) {
        return res.status(200).json({
          success: true,
          data: {
            transactionRef,
            status: 'SUCCESS',
            amount: transaction.amount.totalAmount,
            paidAt: transaction.paidAt,
            mpesaReceipt: transaction.mpesaReceiptNumber,
            rideRequest: existingRide,
          },
        });
      }

      const rideRequest = await RideRequest.create(ridePayload);

      if (transaction.provider && transaction.providerReceives > 0) {
        await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'ride_payment');
      }

      transaction.relatedEntity = rideRequest._id;
      await transaction.save();

      const io = req.app.get('io');
      if (io && selectedRiderId) {
        io.to(`rider_${selectedRiderId}`).emit('ride_request', {
          rideId: rideRequest._id,
          customer: transaction.customer,
          pickupLocation: rideRequest.pickupLocation,
          dropoffLocation: rideRequest.dropoffLocation,
          estimatedDistance: rideRequest.estimatedDistance,
          fare: {
            totalFare: rideRequest.fare.totalFare,
            riderReceives: rideRequest.fare.riderReceives,
            platformFee: rideRequest.fare.platformFee,
          },
          yourRate: rideRequest.fare.ratePerKm,
          isNightRate: rideRequest.fare.isNightRate,
        });

        try {
          await createNotification(
            selectedRiderId,
            'ride_request',
            'New Ride Request',
            `You have a new ride request from ${transaction.customer?.name || 'a customer'}. Pickup: ${rideRequest.pickupLocation?.address || 'selected location'}. You will receive KSh ${rideRequest.fare.riderReceives}.`,
            { rideId: rideRequest._id, customerId: transaction.customer._id },
            `/rider/rides/${rideRequest._id}`,
            '/rider/rides',
            req,
            'rider'
          );
        } catch (err) {
          console.error('[Rider ride request notification failed]', err);
        }
      } else if (io) {
        io.emit('new_ride_request', {
          rideId: rideRequest._id,
          pickupLocation: rideRequest.pickupLocation,
          dropoffLocation: rideRequest.dropoffLocation,
          estimatedDistance: rideRequest.estimatedDistance,
          fare: rideRequest.fare,
        });
      }

      try {
        await createNotification(
          transaction.customer._id,
          'ride_payment_confirmed',
          'Payment Confirmed - Waiting for Rider',
          `Your payment of KSh ${transaction.amount.totalAmount} has been confirmed. We've notified your selected rider and are waiting for their response.`,
          { rideId: rideRequest._id, transactionId: transaction._id },
          `/customer/rides/${rideRequest._id}`,
          '/customer/rides',
        req
      );
      } catch (err) {
        console.error('[Customer ride payment notification failed]', err);
      }

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

  if (!callbackResult.success) {
    console.error('[MPESA] Invalid callback format');
    return res.status(400).json({ success: false, message: 'Invalid callback format' });
  }

  const { checkoutRequestID, resultCode, mpesaReceiptNumber, merchantRequestID, transactionDate, phoneNumber, amount } = callbackResult.data;

  const isSuccess = Number(resultCode) === 0;

  if (!isSuccess) {
    console.log('[MPESA] Payment failed with ResultCode:', resultCode);
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
      const existingRide = await RideRequest.findOne({ transaction: transaction._id });
      if (existingRide) {
        return res.status(200).json({
          success: true,
          message: 'Payment processed successfully',
          data: {
            transactionRef: transaction.transactionRef,
            status: 'SUCCESS',
            amount: transaction.amount.totalAmount,
            paidAt: transaction.paidAt,
            mpesaReceipt: transaction.mpesaReceiptNumber,
            rideRequest: existingRide,
          },
        });
      }

      const selectedRiderId = pendingRideData.selectedRiderId;

      const formatCoordinates = (loc) => {
        if (!loc) return [];
        if (Array.isArray(loc.coordinates)) {
          return loc.coordinates;
        }
        if (loc.coordinates && Array.isArray(loc.coordinates.coordinates)) {
          return loc.coordinates.coordinates;
        }
        return [];
      };

      const formattedPickup = {
        name: pendingRideData.pickupLocation?.name || pendingRideData.pickupLocation?.address || 'Pickup Location',
        address: pendingRideData.pickupLocation?.address || pendingRideData.pickupLocation?.name || 'Pickup Location',
        landmark: pendingRideData.pickupLocation?.landmark,
        coordinates: formatCoordinates(pendingRideData.pickupLocation),
      };

      const formattedDropoff = {
        name: pendingRideData.dropoffLocation?.name || pendingRideData.dropoffLocation?.address || 'Dropoff Location',
        address: pendingRideData.dropoffLocation?.address || pendingRideData.dropoffLocation?.name || 'Dropoff Location',
        landmark: pendingRideData.dropoffLocation?.landmark,
        coordinates: formatCoordinates(pendingRideData.dropoffLocation),
      };

      const ridePayload = {
        customer: transaction.customer._id,
        pickupLocation: formattedPickup,
        dropoffLocation: formattedDropoff,
        estimatedDistance: pendingRideData.estimatedDistance,
        rideType: pendingRideData.rideType || 'bodaboda',
        passengers: 1,
        status: 'waiting_rider',
        paymentStatus: 'paid',
        paymentMethod: 'mpesa',
        transaction: transaction._id,
        fare: pendingRideData.fareBreakdown,
        escrowStatus: 'held',
        fundsReleased: false,
        ...(selectedRiderId && { rider: selectedRiderId }),
      };

      const rideRequest = await RideRequest.create(ridePayload);

      if (transaction.provider && transaction.providerReceives > 0) {
        await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'ride_payment');
      }

      transaction.relatedEntity = rideRequest._id;
      await transaction.save();

      const io = req.app.get('io');
      if (io) {
        if (selectedRiderId) {
          io.to(`rider_${selectedRiderId}`).emit('ride_request', {
            rideId: rideRequest._id,
            customer: transaction.customer,
            pickupLocation: rideRequest.pickupLocation,
            dropoffLocation: rideRequest.dropoffLocation,
            estimatedDistance: rideRequest.estimatedDistance,
            fare: {
              totalFare: rideRequest.fare.totalFare,
              riderReceives: rideRequest.fare.riderReceives,
              platformFee: rideRequest.fare.platformFee,
            },
            yourRate: rideRequest.fare.ratePerKm,
            isNightRate: rideRequest.fare.isNightRate,
          });

          try {
            await createNotification(
              selectedRiderId,
              'ride_request',
              'New Ride Request',
              `You have a new ride request from ${transaction.customer?.name || 'a customer'}. Pickup: ${rideRequest.pickupLocation?.address || 'selected location'}. You will receive KSh ${rideRequest.fare.riderReceives}.`,
            { rideId: rideRequest._id, customerId: transaction.customer._id },
            `/rider/rides/${rideRequest._id}`,
            '/rider/rides',
            req
          );
          } catch (err) {
            console.error('[Selected rider notification failed]', err);
          }
        } else {
          io.emit('new_ride_request', {
            rideId: rideRequest._id,
            pickupLocation: rideRequest.pickupLocation,
            dropoffLocation: rideRequest.dropoffLocation,
            estimatedDistance: rideRequest.estimatedDistance,
            fare: rideRequest.fare,
            riderReceives: rideRequest.fare.riderReceives,
          });
        }

        if (transaction.customer?._id) {
          io.to(`user_${transaction.customer._id}`).emit('payment_confirmed', {
            transactionRef: transaction.transactionRef,
            status: 'paid',
            paymentStatus: 'paid',
            rideId: rideRequest._id,
            customerId: transaction.customer._id,
            amount: transaction.amount.totalAmount,
            mpesaReceipt: mpesaReceiptNumber,
          });
        }
      }

      if (transaction.type === 'order' && transaction.customer?._id) {
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${transaction.customer._id}`).emit('payment_confirmed', {
            transactionRef: transaction.transactionRef,
            status: 'paid',
            paymentStatus: 'paid',
            customerId: transaction.customer._id,
            amount: transaction.amount.totalAmount,
            mpesaReceipt: mpesaReceiptNumber,
          });
        }
      }

      try {
        await createNotification(
          transaction.customer._id,
          'ride_payment_confirmed',
          'Payment Confirmed - Rider Notified',
          `Your payment of KSh ${transaction.amount.totalAmount} has been confirmed. Your selected rider has been notified.`,
          { rideId: rideRequest._id, transactionId: transaction._id },
          `/customer/rides/${rideRequest._id}`,
          '/customer/rides',
          req
        );
      } catch (err) {
        console.error('[Customer ride notification failed]', err);
      }
    }

    try {
      await createPaymentNotification(transaction.customer, transaction, '/customer/rides', req);
    } catch (err) {
      console.error('[Payment notification failed]', err);
    }
  } else if (Number(resultCode) !== 0) {
    transaction.status = 'failed';
    transaction.errorMessage = callbackResult.message;
    transaction.webhookData = payload;
    await transaction.save();

    // Log callback payment failure to SystemLog
    SystemLog.create({
      type: 'payment_failure',
      message: `M-Pesa STK Callback Payment failed: ${callbackResult.message}`,
      details: { callbackResult, payload },
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
          `Your M-Pesa payment of KSh ${transaction.amount.totalAmount} failed. ${callbackResult.message || 'Please try again.'}`,
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
    .populate('customer', 'firstName lastName email phone')
    .populate('provider', 'firstName lastName email phone');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
  }

  if (transaction.status === 'completed' || transaction.status === 'paid') {
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

    if (transaction.provider && transaction.providerReceives > 0) {
      await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'payment_status_poll');
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

      if (product.stock < item.quantity) {
        throw new ResponseError(`Insufficient stock for ${product.name}`, 400);
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        variant: item.variant,
        image: product.images?.[0],
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

    const mpesaResponse = await mpesaService.initiateSTKPush({
      phoneNumber: stkPhone,
      amount: finalAmount,
      transactionRef: transactionRef,
      accountReference: `ORDER-${transactionRef}`,
      transactionDesc: 'Marketplace order payment',
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

  const mpesaResponse = await mpesaService.initiateSTKPush({
    phoneNumber: stkPhone,
    amount: totalAmount,
    transactionRef: transactionRef,
    accountReference: `${entityType}-${transactionRef}`,
    transactionDesc: `${entityType} payment`,
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
