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
  // DO NOT automatically change status to 'confirmed' - landlord must manually accept
  // booking.status = booking.status === 'pending' ? 'confirmed' : booking.status;
  booking.transaction = transaction._id;
  booking.escrowStatus = 'held'; // Money held in escrow until move-in confirmed
  booking.fundsReleased = false;

  // DO NOT set automatic booking start date on payment confirmation
  // This should only be set after customer confirms move-in date
  // const now = new Date();
  // booking.bookingStartDate = now;
  // booking.lastRentPaymentDate = now;

  // DO NOT calculate next rent due date on payment confirmation
  // This should be calculated based on actual move-in date after customer confirms
  // booking.nextRentDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
  // This ensures the cycle is maintained based on the original move-in date
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
 * Night hours: 20:00:00 through 04:59:59
 */
const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 5;
};

/**
 * STEP 1: Calculate fare estimate for ride booking
 * This is called BEFORE payment to show customer the estimated fare.
 * Uses default rates since no rider is selected yet.
 */
export const calculateRideFareEstimate = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation } = req.body;

  console.log('[calculateRideFareEstimate] Request:', { pickupLocation, dropoffLocation });

  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  // Validate coordinates
  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  // Calculate distance
  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);

  // Calculate fare with default rate (no rider selected yet)
  const fareBreakdown = calculateFare(distanceInMeters, 60); // Use default day rate for estimate

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
 * This is the PAYMENT-FIRST workflow entry point when a rider has been selected.
 * 
 * Flow:
 * 1. Customer selects pickup/dropoff
 * 2. Customer selects a rider
 * 3. System calculates fare with selected rider's rates
 * 4. Customer enters M-Pesa number and clicks Pay
 * 5. This endpoint initiates STK Push
 * 6. Customer enters PIN on phone
 * 7. Backend waits for callback
 * 8. Only AFTER payment success: Create RideRequest and notify ONLY the selected rider
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

  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  if (!riderId) {
    throw new ResponseError('Selected rider ID is required', 400);
  }

  // Validate coordinates
  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  // Validate rider exists and has configured rates
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

  // STEP 1: Calculate distance
  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);
  const distanceInKm = Math.round(distanceInMeters / 1000 * 100) / 100;

  // STEP 2: Determine if night time
  const isNight = isNightTime();
  console.log('[initiateMpesaPaymentWithRider] Time check:', { hour: new Date().getHours(), isNight });

  // STEP 3: Calculate fare with selected rider's actual rates
  const fareBreakdown = calculateFareWithRiderRate(distanceInMeters, dayRate, nightRate);

  // The amount customer pays
  const totalAmount = fareBreakdown.totalFare;

  console.log('[initiateMpesaPaymentWithRider] Fare calculation:', {
    distanceInKm,
    riderId,
    dayRate,
    nightRate,
    isNight,
    baseFare: fareBreakdown.baseFare,
    platformFee: fareBreakdown.platformFee,
    customerPays: fareBreakdown.customerPays,
    riderReceives: fareBreakdown.riderReceives,
    totalAmount,
  });

  // STEP 4: Create a PENDING transaction record
  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  console.log('[initiateMpesaPaymentWithRider] Creating transaction:', {
    transactionRef,
    relatedEntityType: 'RideRequest',
    relatedEntityId: null,
    amount: totalAmount,
    type: 'ride',
    customer: customerId,
    provider: riderId,
  });

  // STEP 5: Create transaction payload with validation logging
  const transactionPayload = {
    transactionRef,
    type: 'ride',
    customer: customerId,
    provider: riderId, // Pre-assign to selected rider
    status: 'pending',
    paymentMethod: 'mpesa', // Required field - ConnectHub only supports M-Pesa
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
    relatedEntity: null, // Will be set after payment success
    relatedEntityType: 'RideRequest',
    // Store ride details for later use when creating RideRequest
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

  // Validate transaction payload before creation
  console.log('[TRANSACTION PAYLOAD]', JSON.stringify({
    transactionRef: transactionPayload.transactionRef,
    type: transactionPayload.type,
    customer: transactionPayload.customer,
    provider: transactionPayload.provider,
    paymentMethod: transactionPayload.paymentMethod,
    relatedEntityType: transactionPayload.relatedEntityType,
    amount: transactionPayload.amount,
    customerPaid: transactionPayload.customerPaid,
    providerReceives: transactionPayload.providerReceives,
  }, null, 2));

  const transaction = await Transaction.create(transactionPayload);

  console.log('[initiateMpesaPaymentWithRider] Transaction created:', transactionRef);

  // STEP 6: Initiate M-Pesa STK Push via Daraja API
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
    throw new ResponseError(mpesaResponse.message || 'STK Push failed', 400);
  }

  // Update transaction with MPesa Daraja references
  transaction.mpesaReceiptNumber = mpesaResponse.data?.CheckoutRequestID;
  transaction.darajaResponse = mpesaResponse.data;
  await transaction.save();

  console.log('[initiateMpesaPaymentWithRider] STK Push initiated successfully:', {
    transactionRef,
    checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
    amount: totalAmount,
  });

  res.status(200).json({
    success: true,
    message: 'STK Push initiated. Please check your phone to complete payment.',
    data: {
      transactionRef,
      checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
      amount: totalAmount,
      phone: stkPhone,
      // Store fare breakdown for frontend display
      fare: fareBreakdown,
    },
  });
});

/**
 * STEP 2: Initiate M-Pesa STK Push for ride payment
 * This is the PAYMENT-FIRST workflow entry point.
 * 
 * Flow:
 * 1. Customer selects pickup/dropoff
 * 2. System calculates fare estimate
 * 3. Customer enters M-Pesa number and clicks Pay
 * 4. This endpoint initiates STK Push
 * 5. Customer enters PIN on phone
 * 6. Backend waits for callback
 * 7. Only AFTER payment success: Create RideRequest
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

  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!phoneNumber) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  // Validate coordinates
  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  // STEP 1: Calculate distance
  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);
  const distanceInKm = Math.round(distanceInMeters / 1000 * 100) / 100;

  // STEP 2: Determine if night time
  const isNight = isNightTime();
  console.log('[initiateMpesaPayment] Time check:', { hour: new Date().getHours(), isNight });

  // STEP 3: Calculate fare with default rate (estimate - will be recalculated when rider accepts)
  const fareBreakdown = calculateFare(distanceInMeters, 60); // Default rate for estimate

  // The amount customer pays
  const totalAmount = fareBreakdown.totalFare;

  console.log('[initiateMpesaPayment] Fare calculation:', {
    distanceInKm,
    baseFare: fareBreakdown.baseFare,
    platformFee: fareBreakdown.platformFee,
    customerPays: fareBreakdown.customerPays,
    riderReceives: fareBreakdown.riderReceives,
    totalAmount,
  });

  // STEP 4: Create a PENDING transaction record
  // This transaction is NOT linked to any RideRequest yet - payment comes first!
  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  console.log('[initiateMpesaPayment] Creating transaction:', {
    transactionRef,
    relatedEntityType: 'RideRequest',
    relatedEntityId: null,
    amount: totalAmount,
    type: 'ride',
    customer: customerId,
    provider: null,
  });

  const transaction = await Transaction.create({
    transactionRef,
    type: 'ride',
    customer: customerId,
    provider: null, // No rider assigned yet
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
    relatedEntity: null, // Will be set after payment success
    relatedEntityType: 'RideRequest',
    // Store ride details for later use when creating RideRequest
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

  console.log('[initiateMpesaPayment] Transaction created:', transactionRef);

  // STEP 5: Initiate M-Pesa STK Push via Daraja API
  const customer = await User.findById(customerId);
  if (!customer) {
    throw new ResponseError('Customer not found', 404);
  }

  // Use the phone number provided by customer (or fallback to their account phone)
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
    throw new ResponseError(mpesaResponse.message || 'STK Push failed', 400);
  }

  // Update transaction with MPesa Daraja references
  transaction.mpesaReceiptNumber = mpesaResponse.data?.CheckoutRequestID;
  transaction.darajaResponse = mpesaResponse.data;
  await transaction.save();

  console.log('[initiateMpesaPayment] STK Push initiated successfully:', {
    transactionRef,
    checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
    amount: totalAmount,
  });

  res.status(200).json({
    success: true,
    message: 'STK Push initiated. Please check your phone to complete payment.',
    data: {
      transactionRef,
      checkoutRequestID: mpesaResponse.data?.CheckoutRequestID,
      amount: totalAmount,
      phone: stkPhone,
      // Store fare breakdown for frontend display
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
 * Called by frontend to poll for payment completion.
 */
export const verifyMpesaPayment = asyncHandler(async (req, res) => {
  const { transactionRef } = req.params;

  console.log('[verifyMpesaPayment] Checking status:', transactionRef);

  const transaction = await Transaction.findOne({ transactionRef })
    .populate('customer', 'name email phone');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
  }

  // If already paid, return success immediately
  if (transaction.status === 'paid') {
    console.log('[verifyMpesaPayment] Payment already confirmed:', transactionRef);
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

  // If failed or cancelled, return failure
  if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    console.log('[verifyMpesaPayment] Payment failed/cancelled:', transactionRef);
    return res.status(200).json({
      success: true,
      data: {
        transactionRef,
        status: transaction.status === 'failed' ? 'FAILED' : 'CANCELLED',
        amount: transaction.amount.totalAmount,
      },
    });
  }

  // Still pending - check with Daraja STK status
  const darajaResponse = await mpesaService.checkSTKStatus(transaction.mpesaReceiptNumber);

  // Use Number() conversion because Daraja often returns ResultCode as string "0"
  const darajaResultCode = darajaResponse.data?.ResultCode;
  if (darajaResponse.success && Number(darajaResultCode) === 0) {
    // Payment confirmed!
    transaction.status = 'paid';
    transaction.paidAt = new Date();
    transaction.darajaCallbackData = darajaResponse.data;
    await transaction.save();

    console.log('[verifyMpesaPayment] Payment confirmed via Daraja:', {
      transactionRef,
      mpesaReceipt: transaction.mpesaReceiptNumber,
    });

    // Handle Order payment confirmation
    // Check if this is an order payment (either already linked or has pending entity data)
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

    // STEP 4: NOW create the RideRequest (only after payment success!)
    const pendingRideData = transaction.pendingRideData;
    if (pendingRideData && transaction.type !== 'order' && transaction.type !== 'rental') {
      const selectedRiderId = pendingRideData.selectedRiderId;

      const ridePayload = {
        customer: transaction.customer._id,
        pickupLocation: pendingRideData.pickupLocation,
        dropoffLocation: pendingRideData.dropoffLocation,
        estimatedDistance: pendingRideData.estimatedDistance,
        rideType: pendingRideData.rideType || 'bodaboda',
        passengers: 1,
        status: 'waiting_rider', // Changed from 'pending' to 'waiting_rider' - payment already confirmed
        paymentStatus: 'paid',
        paymentMethod: 'mpesa', // Required field - ConnectHub only supports M-Pesa
        transaction: transaction._id,
        fare: pendingRideData.fareBreakdown,
        // Escrow system - money held until customer confirms arrival
        escrowStatus: 'held',
        fundsReleased: false,
        // Pre-assign to the selected rider (only they will be notified)
        ...(selectedRiderId && { rider: selectedRiderId }),
      };

      // IDEMPOTENCY CHECK: Prevent duplicate ride creation
      const existingRide = await RideRequest.findOne({ transaction: transaction._id });
      if (existingRide) {
        console.log('[IDEMPOTENCY] Ride already exists for transaction:', transaction._id, 'Ride ID:', existingRide._id);
        // Return existing ride instead of creating duplicate
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

      // Validate booking payload before creation
      console.log('[BOOKING PAYLOAD] RideRequest:', JSON.stringify({
        customer: ridePayload.customer,
        pickupLocation: ridePayload.pickupLocation?.address,
        dropoffLocation: ridePayload.dropoffLocation?.address,
        estimatedDistance: ridePayload.estimatedDistance,
        rideType: ridePayload.rideType,
        status: ridePayload.status,
        paymentStatus: ridePayload.paymentStatus,
        paymentMethod: ridePayload.paymentMethod,
        fare: ridePayload.fare,
      }, null, 2));

      const rideRequest = await RideRequest.create(ridePayload);

      console.log('[RIDE STATUS TRANSITION]', {
        previousStatus: null,
        newStatus: 'waiting_rider',
        rideId: rideRequest._id,
        customerId: ridePayload.customer,
        event: 'ride_created_after_payment',
        paymentStatus: 'paid',
        escrowStatus: 'held'
      });

      console.log("[NEWLY CREATED RIDE]", {
        id: rideRequest._id,
        status: rideRequest.status,
        rider: rideRequest.rider,
        customer: rideRequest.customer,
        paymentStatus: rideRequest.paymentStatus,
        selectedRiderId: selectedRiderId
      });

      if (transaction.provider && transaction.providerReceives > 0) {
        await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'ride_payment');
      }

      // Link transaction to ride
      transaction.relatedEntity = rideRequest._id;
      await transaction.save();

      console.log('[verifyMpesaPayment] RideRequest created after payment:', rideRequest._id);

      // Notify ONLY the selected rider via Socket.io (not all nearby riders)
      const io = req.app.get('io');
      if (io && selectedRiderId) {
        // Get rider details for the notification
        const rider = await User.findById(selectedRiderId);

        // Send notification ONLY to the selected rider
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
          // Include rider's own rates info for transparency
          yourRate: rideRequest.fare.ratePerKm,
          isNightRate: rideRequest.fare.isNightRate,
        });

        // Create notification record for the rider
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
        // Fallback: if no specific rider was selected, emit to all nearby riders
        io.emit('new_ride_request', {
          rideId: rideRequest._id,
          pickupLocation: rideRequest.pickupLocation,
          dropoffLocation: rideRequest.dropoffLocation,
          estimatedDistance: rideRequest.estimatedDistance,
          fare: rideRequest.fare,
        });
      }

      // Create notification for customer
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

  // Still pending
  console.log('[verifyMpesaPayment] Payment still pending:', transactionRef);
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
 * This endpoint receives callbacks from Safaricom Daraja API
 * 
 * When ResultCode = 0: Payment successful - create RideRequest and notify rider
 * When ResultCode != 0: Payment failed - NO RideRequest creation
 */
export const mpesaCallback = asyncHandler(async (req, res) => {
  console.log('================ FULL MPESA CALLBACK ================');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('=====================================================');

  const payload = req.body;


  // Process the Daraja callback
  const callbackResult = mpesaService.processCallback(payload);

  if (!callbackResult.success) {
    console.error('[MPESA] Invalid callback format');
    console.log('[MPESA] Raw callback body:', JSON.stringify(payload, null, 2));
    return res.status(400).json({ success: false, message: 'Invalid callback format' });
  }

  const { checkoutRequestID, resultCode, mpesaReceiptNumber, merchantRequestID, transactionDate, phoneNumber, amount } = callbackResult.data;

  console.log('[MPESA CALLBACK RESULT]', {
    ResultCode: resultCode,
    ResultDesc: callbackResult.data?.resultDesc,
    CheckoutRequestID: checkoutRequestID,
    MerchantRequestID: merchantRequestID,
  });

  console.log('[CALLBACK SUCCESS CHECK]', {
    rawResultCode: resultCode,
    type: typeof resultCode,
    numericResult: Number(resultCode),
    isSuccess: Number(resultCode) === 0
  });

  // Check success condition with number/string normalization
  const isSuccess = Number(resultCode) === 0;


  if (!isSuccess) {
    console.log('[MPESA] Payment failed with ResultCode:', resultCode);
  }

  // Transaction lookup audit
  console.log('[TRANSACTION SEARCH]', {
    CheckoutRequestID: checkoutRequestID,
    MerchantRequestID: merchantRequestID,
    mpesaReceiptNumber: mpesaReceiptNumber
  });

  // Find transaction by CheckoutRequestID (stored in mpesaReceiptNumber field during STK push)
  const transaction = await Transaction.findOne({
    $or: [
      { mpesaReceiptNumber: checkoutRequestID },
      { checkoutRequestID: checkoutRequestID },
      { merchantRequestID: merchantRequestID },
      { mpesaReceiptNumber: mpesaReceiptNumber },
    ],
  }).populate('customer', 'name email phone');

  console.log('[TRANSACTION LOOKUP]', {
    CheckoutRequestID: checkoutRequestID,
    MerchantRequestID: merchantRequestID,
    transactionFound: !!transaction,
    transactionId: transaction?._id,
    currentStatus: transaction?.status,
  });


  if (!transaction) {
    console.error('[MPESA] Transaction not found for CheckoutRequestID:', checkoutRequestID);
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  console.log('[TRANSACTION BEFORE UPDATE]', {
    transactionRef: transaction.transactionRef,
    status: transaction.status,
    customerId: transaction.customer?._id
  });

  if (Number(resultCode) === 0) {
    console.log('=================================');
    console.log('[PAYMENT SUCCESS BLOCK ENTERED]');
    console.log('Transaction ID:', transaction._id);
    console.log('Transaction Type:', transaction.type);
    console.log('Pending Data Exists:', !!transaction.pendingEntityData);
    console.log('Pending Entity Type:', transaction.pendingEntityData?.entityType);
    console.log('=================================');

    // Payment successful!
    console.log('========== PAYMENT SUCCESS CALLBACK ==========');
    console.log('Payment ID:', transaction._id);
    console.log('Payment Status:', transaction.status);
    console.log('Pending Entity Data:', JSON.stringify(transaction.pendingEntityData, null, 2));
    console.log('========== END PAYMENT SUCCESS CALLBACK ==========');

    console.log('[PAYMENT DOCUMENT]', {
      transactionId: transaction._id,
      transactionRef: transaction.transactionRef,
      status: transaction.status,
      paymentStatus: transaction.paymentStatus,
      type: transaction.type,
      customer: transaction.customer?._id,
      business: transaction.business?._id,
    });

    console.log('[CALLBACK OVERRIDING STATUS]', {
      previousStatus: transaction.status,
      resultCode,
      transactionRef: transaction.transactionRef,
    });

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

    // Reload to verify persistence
    const reloaded = await Transaction.findById(transaction._id);
    console.log('[CALLBACK SAVE VERIFIED]', {
      id: reloaded?._id,
      status: reloaded?.status,
      paymentStatus: reloaded?.paymentStatus,
    });

    if (reloaded?.status !== 'paid') {
      console.error(
        '[MPESA] CRITICAL: Transaction status not saved correctly! Expected: paid, Got:',
        reloaded?.status
      );
    }

    console.log('[TRANSACTION UPDATED]', {
      transactionRef: transaction.transactionRef,
      status: transaction.status,
      paidAt: transaction.paidAt,
    });

    console.log('[PAYMENT SUCCESS]', {
      transactionId: transaction._id,
      transactionRef: transaction.transactionRef,
      type: transaction.type,
      customerId: transaction.customer?._id,
      paymentStatus: 'paid',
    });
  }


  // Handle Order payment confirmation (only for successful payments that were just processed)
  // This runs after the status has been updated to 'paid' above
  if (Number(resultCode) === 0 && transaction.status === 'paid') {
    const pendingEntityData = transaction.pendingEntityData;

    console.log('[ORDER CREATION CONDITIONS]');
    console.log({
      paymentStatus: transaction.status,
      resultCode: Number(resultCode),
      shouldCreate:
        (transaction.status === 'paid' ||
          transaction.status === 'completed') &&
        Number(resultCode) === 0
    });

    console.log('[MPESA CALLBACK] Checking payment type:', {
      type: transaction.type,
      hasRelatedEntity: !!transaction.relatedEntity,
      hasPendingEntityData: !!pendingEntityData
    });

    if (transaction.type === 'order' && (transaction.relatedEntity || pendingEntityData)) {
      // CART-BASED PAYMENT: Create order first, then handle payment success
      console.log('[CART ORDER CONDITION CHECK]');
      console.log({
        transactionType: transaction.type,
        entityType: transaction.pendingEntityData?.entityType
      });

      if (pendingEntityData?.entityType === 'cart') {
        console.log('[ENTERED CART ORDER CREATION BLOCK]');
        console.log('[PAYMENT SUCCESS CALLBACK]');
        console.log('[PENDING ENTITY DATA]', JSON.stringify(pendingEntityData, null, 2));
        console.log('[TRANSACTION CUSTOMER]', transaction.customer._id);
        console.log('[TRANSACTION CUSTOMER POPULATED]', transaction.customer);

        const { items, deliveryAddress, deliveryFee, businessId, paymentBreakdown } = pendingEntityData;

        console.log('[EXTRACTED DATA]', {
          itemsCount: items?.length,
          businessId,
          deliveryAddress: deliveryAddress?.address,
          totalAmount: paymentBreakdown?.baseAmount,
          finalAmount: paymentBreakdown?.totalAmount,
        });

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
          status: 'pending', // Order is pending business acceptance, but payment is confirmed
          paymentStatus: 'paid', // Payment is confirmed
          paymentMethod: 'mpesa',
          deliveryAddress: {
            phone: deliveryAddress.phone,
            address: deliveryAddress.address,
            neighborhood: deliveryAddress.neighborhood || '',
            landmark: deliveryAddress.landmark || '',
          },
        };

        console.log('[ORDER PAYLOAD]');
        console.log({
          customer: orderPayload.customer,
          business: orderPayload.business,
          items: orderPayload.items,
          totalAmount: orderPayload.totalAmount,
          paymentStatus: orderPayload.paymentStatus,
          status: orderPayload.status
        });

        // Validate no undefined/null critical fields
        if (!orderPayload.customer) console.error('[PAYLOAD VALIDATION ERROR] customer is undefined/null');
        if (!orderPayload.business) console.error('[PAYLOAD VALIDATION ERROR] business is undefined/null');
        if (!orderPayload.items || orderPayload.items.length === 0) console.error('[PAYLOAD VALIDATION ERROR] items is empty/undefined');
        if (!orderPayload.totalAmount) console.error('[PAYLOAD VALIDATION ERROR] totalAmount is undefined/null');

        console.log('========== ORDER DATA ==========');
        console.log(JSON.stringify(orderPayload, null, 2));
        console.log('========== END ORDER DATA ==========');

        try {
          console.log('[SAVING ORDER TO DATABASE]');

          console.log('[ABOUT TO CREATE ORDER]');
          console.log(JSON.stringify(orderPayload, null, 2));

          const order = new Order(orderPayload);

          console.log('[ORDER INSTANCE CREATED]', order);

          const savedOrder = await order.save();

          console.log('[ORDER SAVED]');
          console.log(savedOrder._id);

          console.log('[ORDER SAVED SUCCESSFULLY]');
          console.log(savedOrder);

          transaction.relatedEntity = savedOrder._id;
          transaction.relatedEntityType = 'order';

          await transaction.save();

          console.log('[PAYMENT LINKED TO ORDER]');

          // Now handle payment success (notify business, credit escrow, etc.)
          await handleOrderPaymentSuccess(transaction, savedOrder._id, req);
          console.log('[CART ORDER PAYMENT SUCCESS HANDLED]', savedOrder._id);
        } catch (error) {
          console.error('[ORDER CREATION FAILED]');
          console.error(error);
          console.error(error.stack);
          console.error('========== ORDER SAVE FAILED ==========');
          console.error(error);
          console.error(error.errors);
          console.error('========== END ORDER SAVE FAILED ==========');
          throw error;
        }
      } else {
        // EXISTING ORDER PAYMENT: Handle payment success for existing order
        const orderId = transaction.relatedEntity || pendingEntityData?.entityId;
        console.log('[MPESA CALLBACK] Calling handleOrderPaymentSuccess for existing orderId:', orderId);
        const order = await handleOrderPaymentSuccess(transaction, orderId, req);
        console.log('[MPESA CALLBACK] handleOrderPaymentSuccess completed, order:', order?._id);
      }
    }

    if (transaction.type === 'rental' && pendingEntityData) {
      // Check if this is a monthly rent payment
      if (pendingEntityData.isMonthlyRent || transaction.metadata?.isMonthlyRent) {
        console.log('[MPESA CALLBACK] Calling handleMonthlyRentPaymentSuccess');
        await handleMonthlyRentPaymentSuccess(transaction, pendingEntityData, req);
      } else {
        // Initial rental booking payment
        console.log('[MPESA CALLBACK] Calling handleRentalPaymentSuccess');
        await handleRentalPaymentSuccess(transaction, pendingEntityData, req);
      }
    }

    // Create RideRequest ONLY for ride payments (never for marketplace orders)
    const pendingRideData = transaction.pendingRideData;
    console.log('[MPESA CALLBACK] Checking ride payment:', {
      hasPendingRideData: !!pendingRideData,
      type: transaction.type,
      shouldCreateRide: pendingRideData && transaction.type !== 'order'
    });

    console.log('[RIDE CALLBACK START]');
    console.log('[RIDE CALLBACK] Transaction:', transaction._id);
    console.log('[RIDE CALLBACK] pendingRideData:', JSON.stringify(pendingRideData, null, 2));

    if (pendingRideData && transaction.type !== 'order') {
      // IDEMPOTENCY CHECK: Prevent duplicate ride creation
      const existingRide = await RideRequest.findOne({ transaction: transaction._id });
      if (existingRide) {
        console.log('[IDEMPOTENCY] Ride already exists for transaction:', transaction._id, 'Ride ID:', existingRide._id);
        // Skip ride creation, just send notification if needed
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

      console.log('[RIDE CALLBACK] Selected Rider ID:', selectedRiderId);
      console.log('[RIDE CALLBACK] Customer ID:', transaction.customer._id);

      const ridePayload = {
        customer: transaction.customer._id,
        pickupLocation: pendingRideData.pickupLocation,
        dropoffLocation: pendingRideData.dropoffLocation,
        estimatedDistance: pendingRideData.estimatedDistance,
        rideType: pendingRideData.rideType || 'bodaboda',
        passengers: 1,
        status: 'waiting_rider', // Changed from 'pending' to 'waiting_rider' per business rules
        paymentStatus: 'paid',
        paymentMethod: 'mpesa', // Required field - ConnectHub only supports M-Pesa
        transaction: transaction._id,
        fare: pendingRideData.fareBreakdown,
        escrowStatus: 'held', // Set escrow status to held
        fundsReleased: false, // Funds not released yet
        // Pre-assign to the selected rider if one was selected
        ...(selectedRiderId && { rider: selectedRiderId }),
      };

      console.log('[CREATING RIDE]', JSON.stringify(ridePayload, null, 2));

      const rideRequest = await RideRequest.create(ridePayload);

      console.log('[RIDE STATUS TRANSITION]', {
        previousStatus: null,
        newStatus: 'waiting_rider',
        rideId: rideRequest._id,
        customerId: ridePayload.customer,
        event: 'ride_created_after_payment_callback',
        paymentStatus: 'paid',
        escrowStatus: 'held'
      });

      console.log('[RIDE CREATED]', rideRequest._id);
      console.log('[RIDE CREATED DATA]', JSON.stringify(rideRequest, null, 2));
      console.log("[NEWLY CREATED RIDE]", {
        id: rideRequest._id,
        status: rideRequest.status,
        rider: rideRequest.rider,
        customer: rideRequest.customer,
        paymentStatus: rideRequest.paymentStatus,
        selectedRiderId: selectedRiderId
      });

      if (transaction.provider && transaction.providerReceives > 0) {
        await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'ride_payment');
      }

      // Link transaction to ride
      transaction.relatedEntity = rideRequest._id;
      await transaction.save();

      console.log('[mpesaCallback] RideRequest created after payment:', rideRequest._id);

      // Notify riders via Socket.io
      const io = req.app.get('io');
      if (io) {
        if (selectedRiderId) {
          // Notify ONLY the selected rider
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

          // Create notification record for the selected rider
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
          // Broadcast to all nearby riders
          io.emit('new_ride_request', {
            rideId: rideRequest._id,
            pickupLocation: rideRequest.pickupLocation,
            dropoffLocation: rideRequest.dropoffLocation,
            estimatedDistance: rideRequest.estimatedDistance,
            fare: rideRequest.fare,
            riderReceives: rideRequest.fare.riderReceives,
          });
        }

        // Emit payment_confirmed to customer via Socket.io for real-time redirect
        if (transaction.customer?._id) {
          console.log('[SOCKET EMIT] Emitting payment_confirmed to customer:', transaction.customer._id);
          io.to(`user_${transaction.customer._id}`).emit('payment_confirmed', {
            transactionRef: transaction.transactionRef,
            status: 'paid',
            paymentStatus: 'paid',
            rideId: rideRequest._id,
            customerId: transaction.customer._id,
            amount: transaction.amount.totalAmount,
            mpesaReceipt: mpesaReceiptNumber,
          });
          console.log('[SOCKET EMIT] payment_confirmed emitted successfully');
        }
      }

      // For order payments, emit payment_confirmed if not already emitted by handleOrderPaymentSuccess
      if (transaction.type === 'order' && transaction.customer?._id) {
        const io = req.app.get('io');
        if (io) {
          console.log('[SOCKET EMIT] Emitting payment_confirmed for order payment to customer:', transaction.customer._id);
          io.to(`user_${transaction.customer._id}`).emit('payment_confirmed', {
            transactionRef: transaction.transactionRef,
            status: 'paid',
            paymentStatus: 'paid',
            customerId: transaction.customer._id,
            amount: transaction.amount.totalAmount,
            mpesaReceipt: mpesaReceiptNumber,
          });
          console.log('[SOCKET EMIT] payment_confirmed emitted successfully for order');
        }
      }

      // Create notification for customer
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

    // Create payment notification
    try {
      await createPaymentNotification(transaction.customer, transaction, '/customer/rides', req);
    } catch (err) {
      console.error('[Payment notification failed]', err);
    }
  } else if (Number(resultCode) !== 0) {
    // Payment failed - DO NOT create RideRequest
    transaction.status = 'failed';
    transaction.errorMessage = callbackResult.message;
    transaction.webhookData = payload;
    await transaction.save();

    console.log('[mpesaCallback] Payment failed:', {
      transactionRef: transaction.transactionRef,
      resultCode,
      resultDesc: callbackResult.data?.resultDesc,
    });

    // Notify customer of failure
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
 * Returns: PENDING, SUCCESS, or FAILED based on Daraja result
 */
export const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { transactionRef } = req.params;

  console.log('[STATUS ENDPOINT] Request received for transactionRef:', transactionRef);

  const transaction = await Transaction.findOne({ transactionRef })
    .populate('customer', 'firstName lastName email phone')
    .populate('provider', 'firstName lastName email phone');

  if (!transaction) {
    console.log('[STATUS ENDPOINT] Transaction not found:', transactionRef);
    throw new ResponseError('Transaction not found', 404);
  }

  console.log('[STATUS ENDPOINT]', {
    requestedRef: req.params.transactionRef,
    foundTransaction: transaction?.transactionRef,
    status: transaction?.status,
    paymentStatus: transaction?.paymentStatus,
    paidAt: transaction?.paidAt,
    completedAt: transaction?.completedAt
  });

  // CRITICAL: If already paid or completed, return immediately and NEVER overwrite
  if (transaction.status === 'completed' || transaction.status === 'paid') {
    console.log('[STATUS ENDPOINT] Already paid/completed, returning paid. DO NOT OVERWRITE:', transactionRef);
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

  // If failed, return failed status (but don't change it)
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

  // Only query Daraja if still pending
  const darajaResponse = await mpesaService.checkSTKStatus(transaction.mpesaReceiptNumber);

  const resultCode = darajaResponse.data?.ResultCode;
  const isSuccess = Number(resultCode) === 0;

  // Re-check status after Daraja query in case callback updated it
  const freshTransaction = await Transaction.findById(transaction._id);
  if (freshTransaction && (freshTransaction.status === 'paid' || freshTransaction.status === 'completed')) {
    console.log('[STATUS ENDPOINT] Transaction was updated by callback during polling. Returning paid:', transactionRef);
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
    // Payment confirmed!
    transaction.status = 'paid';
    transaction.paymentStatus = 'paid';
    transaction.completedAt = new Date();
    transaction.paidAt = new Date();
    transaction.mpesaReceiptNumber = darajaResponse.data?.mpesaReceiptNumber || transaction.mpesaReceiptNumber;
    await transaction.save();

    console.log('[STATUS ENDPOINT] Payment confirmed via Daraja poll:', transactionRef);

    // Update provider's wallet with pending balance (escrow)
    if (transaction.provider && transaction.providerReceives > 0) {
      await creditPendingEscrow(transaction.provider, transaction.providerReceives, 'payment_status_poll');
    }

    // Create notification for customer
    const customerNavTarget = transaction.type === 'order' ? '/customer/orders' :
      transaction.type === 'rental' ? '/customer/rentals' : '/customer/rides';
    await createPaymentNotification(transaction.customer, transaction, customerNavTarget, req);

    // Create notification for provider
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
    // Handle non-zero ResultCodes
    const numericCode = Number(resultCode);

    // ResultCode 4999 = transaction still processing, keep as pending
    if (numericCode === 4999) {
      console.log('[STATUS ENDPOINT] Transaction still processing (ResultCode 4999):', transactionRef);
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

    // Any other non-zero code = payment failed (1, 1032, 1037, 2001, etc.)
    if (darajaResponse.success && resultCode !== undefined && Number.isFinite(numericCode) && numericCode !== 0) {
      // Only mark as failed if we're still pending (not paid by callback)
      const currentStatus = await Transaction.findById(transaction._id, 'status');
      if (currentStatus && currentStatus.status !== 'paid' && currentStatus.status !== 'completed') {
        transaction.status = 'failed';
        transaction.errorMessage = darajaResponse.data?.ResultDesc;
        await transaction.save();
        console.log('[STATUS ENDPOINT] Marked as failed via Daraja poll:', transactionRef, 'ResultCode:', numericCode);
      } else {
        console.log('[STATUS ENDPOINT] Skipping failed update - already paid by callback:', transactionRef);
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


  // Still pending
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
 * Initialize a payment for an order or rental (PAYMENT-FIRST workflow)
 * 
 * IMPORTANT: This follows the same payment-first procedure as Bodaboda rides:
 * 1. Customer initiates payment (STK Push)
 * 2. Customer pays via M-Pesa
 * 3. ONLY after payment success: Order/Rental is confirmed and provider is notified
 * 4. Provider is NOT notified before payment succeeds
 */
export const initiatePayment = asyncHandler(async (req, res) => {
  const {
    entityType, // 'Order', 'Rental', 'order', 'rental', 'cart'
    entityId,
    deliveryFee = 0,
    phoneNumber, // M-Pesa phone number for STK Push
    items, // For cart-based payments (order doesn't exist yet)
    deliveryAddress, // For cart-based payments
  } = req.body;

  console.log('[initiatePayment] INITIATING PAYMENT', req.body);

  const customerId = req.user._id;
  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Validate phone number
  if (!phoneNumber) {
    console.error('[initiatePayment] Missing phone number');
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  // Validate phone number format
  const phoneRegex = /^254(7|8|9|1)\d{8}$/;
  if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
    // Try to format it
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 9 && /^[7891]/.test(cleaned)) {
      cleaned = '254' + cleaned;
    }

    if (!phoneRegex.test(cleaned)) {
      console.error('[initiatePayment] Invalid phone number:', phoneNumber);
      throw new ResponseError('Invalid phone number. Use format: 2547XXXXXXXX or 07XXXXXXXX', 400);
    }
  }

  // CART-BASED PAYMENT (order doesn't exist yet)
  if (entityType?.toLowerCase() === 'cart') {
    if (!items || items.length === 0) {
      throw new ResponseError('Cart items are required for cart-based payment', 400);
    }

    if (!deliveryAddress || !deliveryAddress.address || !deliveryAddress.phone) {
      throw new ResponseError('Delivery address and phone are required', 400);
    }

    // Validate items and get prices
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

    // Calculate payment breakdown with platform fee
    const paymentBreakdown = calculateShoppingPayment(totalAmount, deliveryFee);
    const finalAmount = paymentBreakdown.customerPays;

    // Determine business from first product
    const firstProduct = await Product.findById(validatedItems[0].product);
    const businessId = firstProduct?.business;

    if (!businessId) {
      throw new ResponseError('Product has no associated business. Cannot process payment.', 400);
    }

    console.log('[initiatePayment] CART PAYMENT:', {
      totalAmount,
      finalAmount,
      businessId,
      itemCount: validatedItems.length,
    });

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
      relatedEntity: null, // Will be set after payment success
      relatedEntityType: 'order',
      // Store cart data for order creation after payment success
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

  // EXISTING ENTITY PAYMENT (order/rental already exists)
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
      console.error('[initiatePayment] Invalid entity type:', entityType);
      throw new ResponseError('Invalid entity type. Use: order, rental, or cart', 400);
  }

  // Check if entity is already paid
  if (entity.status === 'paid' || entity.status === 'completed') {
    console.error('[initiatePayment] Entity already paid:', entityId);
    throw new ResponseError(`${entityType} is already paid`, 400);
  }

  // Determine the amount to charge
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

  console.log('[initiatePayment] Amount calculation:', {
    entityType,
    entityId,
    orderFinalAmount: entity.finalAmount,
    orderTotalAmount: entity.totalAmount,
    baseAmount,
    deliveryFee,
    platformFee: paymentBreakdown.platformFee,
    totalAmountToCharge: totalAmount,
  });

  console.log('[initiatePayment] Creating transaction:', {
    transactionRef,
    relatedEntityType: entityTypeLower,
    relatedEntityId: entityId,
    amount: totalAmount,
    type: entityTypeLower,
    customer: customerId,
    provider: providerId,
  });

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
 * Complete a transaction (after customer confirms receipt/completion)
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

  // Only customer can confirm completion
  if (transaction.customer._id.toString() !== userId.toString()) {
    throw new ResponseError('Only the customer can confirm completion', 403);
  }

  if (transaction.status !== 'paid') {
    throw new ResponseError('Payment must be confirmed before completion', 400);
  }

  // Update transaction status
  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transaction.save();

  // Update provider's wallet - move from pending to available balance
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

  // Create notification for transaction completion
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
    .populate('customer', 'firstName lastName email phone')
    .populate('provider', 'firstName lastName email phone');

  if (!transaction) {
    throw new ResponseError('Transaction not found', 404);
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

  // Get recent transactions summary
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