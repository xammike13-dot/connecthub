import RideRequest from '../models/RideRequest.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { calculateFare, calculateFareWithDefaultRate, calculateFareWithRiderRate, MINIMUM_FARE } from '../utils/rideFareCalculator.js';
import { formatDistance, distanceToKm } from '../utils/distanceFormatter.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { createRideNotification } from './notificationController.js';
import { releaseEscrow } from '../utils/walletService.js';

/**
 * Determine if current time is night rate
 * Night hours: 8:00 PM (20:00) to 4:59 AM (04:59)
 * Day hours: 5:00 AM (05:00) to 7:59 PM (19:59)
 */
const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 5;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * This is a fallback when routing API is not available
 * For production, use Google Maps Distance Matrix API or similar
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
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
 * Get distance between two points using routing API
 * Falls back to Haversine if API is not configured
 * 
 * @param {Object} pickup - Pickup location with coordinates
 * @param {Object} dropoff - Dropoff location with coordinates
 * @returns {Promise<number>} Distance in meters
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
        return data.rows[0].elements[0].distance.value; // Distance in meters
      }
    } catch (error) {
      console.error('Google Maps API error, falling back to Haversine:', error.message);
    }
  }

  // Fallback to Haversine calculation
  return calculateHaversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
};

/**
 * Create a new ride request
 * If riderId is provided, uses the rider's actual rates for fare calculation
 * If no riderId, uses default rates (estimate only - will be recalculated when rider accepts)
 */
export const createRideRequest = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can request rides', 403);
  }

  const {
    pickupLocation,
    dropoffLocation,
    rideType = 'bodaboda',
    passengers = 1,
    specialRequests,
    riderId, // Optional: if customer has selected a specific rider
    transactionId, // Required: payment transaction must be confirmed before ride creation
  } = req.body;

  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  // Validate pickup location coordinates
  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates. Expected GeoJSON Point format', 400);
  }

  // Validate dropoff location coordinates
  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates. Expected GeoJSON Point format', 400);
  }

  // Validate payment transaction - rides can only be created after payment is confirmed
  if (!transactionId) {
    throw new ResponseError('Payment transaction ID is required. Please complete payment first.', 400);
  }

  // Verify transaction exists and is paid
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new ResponseError('Payment transaction not found', 404);
  }

  if (transaction.status !== 'paid') {
    throw new ResponseError('Payment must be confirmed before creating a ride request', 400);
  }

  if (transaction.customer.toString() !== customerId.toString()) {
    throw new ResponseError('Payment transaction does not belong to this customer', 403);
  }

  // Check if ride already exists for this transaction (idempotency)
  const existingRide = await RideRequest.findOne({ transaction: transactionId });
  if (existingRide) {
    throw new ResponseError('Ride already exists for this payment transaction', 409);
  }

  // STEP 1: Calculate distance between pickup and dropoff
  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);

  // STEP 2: Determine if night time
  const isNight = isNightTime();
  console.log('[rideController] Time check:', { hour: new Date().getHours(), isNight });

  // STEP 3: Calculate fare - use rider's rates if riderId provided, otherwise use default
  let fareBreakdown;
  let usedRiderRates = false;
  let riderDayRate = null;
  let riderNightRate = null;

  if (riderId) {
    // Fetch the rider's profile to get their rates
    const rider = await User.findById(riderId);
    if (!rider) {
      throw new ResponseError('Selected rider not found', 404);
    }

    if (rider.role !== 'rider') {
      throw new ResponseError('Selected user is not a rider', 400);
    }

    // Get rider's configured rates
    riderDayRate = rider.riderProfile?.dayRatePerKm;
    riderNightRate = rider.riderProfile?.nightRatePerKm;

    console.log('Loaded Rider Profile', rider.riderProfile);
    console.log('[rideController] Loaded rider rates:', {
      riderId,
      dayRate: riderDayRate,
      nightRate: riderNightRate
    });

    if (riderDayRate !== null && riderDayRate !== undefined && !isNaN(riderDayRate) && riderDayRate > 0 &&
      riderNightRate !== null && riderNightRate !== undefined && !isNaN(riderNightRate) && riderNightRate > 0) {
      // Use rider's actual rates
      const selectedRate = isNight ? riderNightRate : riderDayRate;
      fareBreakdown = calculateFare(distanceInMeters, selectedRate);
      usedRiderRates = true;

      // Log booking details (exact format per requirements)
      console.log({
        riderId,
        dayRate: riderDayRate,
        nightRate: riderNightRate,
        selectedRate,
        isNight,
      });
    } else {
      console.log('[rideController] Rider has not configured rates, using default rates');
      fareBreakdown = calculateFareWithDefaultRate(distanceInMeters);
    }
  } else {
    // No rider selected, use default rates for estimate
    fareBreakdown = calculateFareWithDefaultRate(distanceInMeters);
  }

  // Debug logging
  console.log('[rideController] Computed Fare Breakdown:', fareBreakdown);

  // STEP 4: Build the ride request with proper fare object
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
    name: pickupLocation.name || pickupLocation.address || 'Pickup Location',
    address: pickupLocation.address || pickupLocation.name || 'Pickup Location',
    landmark: pickupLocation.landmark,
    coordinates: formatCoordinates(pickupLocation),
  };

  const formattedDropoff = {
    name: dropoffLocation.name || dropoffLocation.address || 'Dropoff Location',
    address: dropoffLocation.address || dropoffLocation.name || 'Dropoff Location',
    landmark: dropoffLocation.landmark,
    coordinates: formatCoordinates(dropoffLocation),
  };

  const ridePayload = {
    customer: customerId,
    transaction: transactionId, // Link to confirmed payment transaction
    pickupLocation: formattedPickup,
    dropoffLocation: formattedDropoff,
    estimatedDistance: Math.round(distanceInMeters / 1000 * 100) / 100, // Distance in km
    rideType,
    passengers,
    specialRequests,
    status: 'waiting_rider', // Payment confirmed, waiting for rider to accept
    paymentStatus: 'paid', // Payment is already confirmed
    // Fare object with all required fields from centralized calculator
    fare: {
      baseFare: fareBreakdown.baseFare,
      totalFare: fareBreakdown.totalFare,        // What customer pays (baseFare + customerShare)
      platformFee: fareBreakdown.platformFee,
      customerShare: fareBreakdown.customerShare,
      riderShare: fareBreakdown.riderShare,
      riderReceives: fareBreakdown.riderReceives,
      // Metadata for debugging and display
      ratePerKm: fareBreakdown.ratePerKm,
      distanceInKm: fareBreakdown.distanceInKm,
      appliedRule: fareBreakdown.appliedRule,
      // Store rider rates info if used
      ...(usedRiderRates && {
        riderId,
        riderDayRate,
        riderNightRate,
        isNightRate: isNight,
      }),
    },
  };

  console.log('[rideController] Ride Payload Fare:', JSON.stringify(ridePayload.fare, null, 2));

  // Log complete fare calculation details for verification
  console.log('[rideController] Fare Calculation Verification:', {
    distance: fareBreakdown.distanceInKm + ' km',
    isNight,
    dayRate: riderDayRate || 'N/A (using default)',
    nightRate: riderNightRate || 'N/A (using default)',
    selectedRate: fareBreakdown.ratePerKm,
    baseFare: fareBreakdown.baseFare,
    platformFee: fareBreakdown.platformFee,
    customerPays: fareBreakdown.customerPays,
    riderReceives: fareBreakdown.riderReceives,
  });

  const rideRequest = await RideRequest.create(ridePayload);

  console.log('[RIDE STATUS TRANSITION]', {
    previousStatus: null,
    newStatus: 'waiting_rider',
    rideId: rideRequest._id,
    customerId: customerId,
    transactionId: transactionId,
    event: 'ride_created_after_payment'
  });

  console.log("[NEWLY CREATED RIDE]", {
    id: rideRequest._id,
    status: rideRequest.status,
    rider: rideRequest.rider,
    customer: rideRequest.customer,
    paymentStatus: rideRequest.paymentStatus,
    transaction: rideRequest.transaction
  });

  // Emit Socket.io event to notify specific rider or all riders
  const io = req.app.get('io');
  if (io) {
    if (riderId) {
      // Notify specific rider
      io.to(`rider_${riderId}`).emit('ride_request', {
        rideId: rideRequest._id,
        pickupLocation: rideRequest.pickupLocation,
        fare: rideRequest.fare,
        customer: customerId,
      });
    } else {
      // Notify all riders in riders room
      io.to('riders').emit('ride_request', {
        rideId: rideRequest._id,
        pickupLocation: rideRequest.pickupLocation,
        fare: rideRequest.fare,
        customer: customerId,
      });
    }
  }

  // Create notification for customer
  try {
    await createRideNotification(customerId, rideRequest, 'waiting_rider', 'customer', req);
  } catch (err) {
    console.error('[Customer ride request notification failed]', err);
  }

  res.status(201).json({
    success: true,
    message: 'Ride request created successfully',
    data: rideRequest,
  });
});

/**
 * Get available ride requests for riders
 */
export const getAvailableRides = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  // Query for rides assigned to this rider with waiting_rider status
  // Also include rides without a rider assigned (legacy support)
  const rideRequests = await RideRequest.find({
    status: 'waiting_rider',
    $or: [
      { rider: riderId },  // Rides assigned to this rider
      { rider: { $exists: false } },  // Rides without assigned rider (legacy)
      { rider: null },  // Rides with null rider
    ],
  })
    .populate('customer', 'name phone avatar riderProfile')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    success: true,
    data: rideRequests,
  });
});

/**
 * Get ride requests for customer
 */
export const getCustomerRides = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  let query = { customer: customerId };
  // Filter out archived rides by default
  query.hiddenByCustomer = { $ne: true };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const rides = await RideRequest.find(query)
    .populate('rider', 'name phone avatar riderProfile')
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

/**
 * Get ride requests for rider
 */
export const getRiderRides = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  let query = { rider: riderId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const rides = await RideRequest.find(query)
    .populate('customer', 'name phone avatar')
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

/**
 * Get ride by ID
 */
export const getRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id;

  const ride = await RideRequest.findById(rideId)
    .populate('customer', 'name email phone avatar address')
    .populate('rider', 'name email phone avatar riderProfile');

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  // Check authorization
  if (
    ride.customer.toString() !== userId.toString() &&
    ride.rider?.toString() !== userId.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ResponseError('Not authorized to view this ride', 403);
  }

  res.status(200).json({
    success: true,
    data: ride,
  });
});

/**
 * Accept a ride (rider accepts)
 * When a rider accepts, we recalculate the fare using the rider's configured rates
 */
export const acceptRide = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { rideId } = req.params;

  if (req.user.role !== 'rider') {
    throw new ResponseError('Only riders can accept rides', 403);
  }

  const ride = await RideRequest.findById(rideId);

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  if (ride.status !== 'waiting_rider') {
    throw new ResponseError('Ride is no longer available', 400);
  }

  console.log("========== RIDE BEFORE ACCEPT ==========");
  console.log({
    id: ride._id,
    status: ride.status,
    rider: ride.rider,
    riderId: riderId,
    customer: ride.customer,
    paymentStatus: ride.paymentStatus,
    acceptedAt: ride.acceptedAt,
    createdAt: ride.createdAt
  });

  // Allow acceptance if:
  // 1. Ride is not assigned to any rider (legacy workflow)
  // 2. Ride is assigned to this rider (payment-first workflow)
  // 3. Ride is assigned to this rider (current rider matches)
  if (ride.rider && ride.rider.toString() !== riderId.toString()) {
    throw new ResponseError('Ride already accepted by another rider', 400);
  }

  // STEP 1: Get the rider's configured rates from the database
  const rider = await User.findById(riderId);
  if (!rider) {
    throw new ResponseError('Rider not found', 404);
  }

  // STEP 2: Validate that rider has configured rates
  const dayRate = rider.riderProfile?.dayRatePerKm;
  const nightRate = rider.riderProfile?.nightRatePerKm;

  if (dayRate === null || dayRate === undefined || isNaN(dayRate) || dayRate <= 0) {
    throw new ResponseError('Rider has not configured day/night rates.', 400);
  }

  if (nightRate === null || nightRate === undefined || isNaN(nightRate) || nightRate <= 0) {
    throw new ResponseError('Rider has not configured day/night rates.', 400);
  }

  // STEP 3: Recalculate fare using the rider's actual rates
  // Use the original distance in meters (convert from stored km)
  const distanceInMeters = Math.round(ride.estimatedDistance * 1000);

  // Calculate fare with rider's rates (day/night determined by current time)
  const fareBreakdown = calculateFareWithRiderRate(distanceInMeters, dayRate, nightRate);

  // STEP 4: Update the ride with the rider's actual fare
  console.log('[RIDE STATUS TRANSITION]', {
    previousStatus: ride.status,
    newStatus: 'accepted',
    rideId: ride._id,
    riderId: riderId,
    event: 'rider_accepted_ride'
  });

  ride.rider = riderId;
  ride.status = 'accepted';
  ride.acceptedAt = new Date();

  // Update fare with rider's actual rates
  ride.fare = {
    baseFare: fareBreakdown.baseFare,
    totalFare: fareBreakdown.totalFare,
    platformFee: fareBreakdown.platformFee,
    customerShare: fareBreakdown.customerShare,
    riderShare: fareBreakdown.riderShare,
    riderReceives: fareBreakdown.riderReceives,
    ratePerKm: fareBreakdown.ratePerKm,
    distanceInKm: fareBreakdown.distanceInKm,
    appliedRule: fareBreakdown.appliedRule,
    // Store which rider's rates were used
    riderId: riderId,
    riderDayRate: dayRate,
    riderNightRate: nightRate,
  };

  console.log('[rideController] Fare recalculated with rider rates:', fareBreakdown);

  await ride.save();

  // Update rider profile
  await User.findByIdAndUpdate(
    riderId,
    { $inc: { 'riderProfile.totalRides': 1 } }
  );

  // Emit Socket.io event to customer
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${ride.customer}`).emit('ride_accepted', {
      rideId: ride._id,
      riderId,
      riderName: req.user.name,
      riderPhone: req.user.phone,
      riderProfile: req.user.riderProfile,
      updatedFare: ride.fare,
    });
  }

  // Create notification for customer only
  try {
    await createRideNotification(ride.customer, ride, 'accepted', 'customer', req);
  } catch (err) {
    console.error('[Customer ride accepted notification failed]', err);
  }

  res.status(200).json({
    success: true,
    message: 'Ride accepted successfully',
    data: ride,
  });
});

/**
 * Update ride status
 */
export const updateRideStatus = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const validStatuses = ['pending_payment', 'waiting_rider', 'accepted', 'in_progress', 'awaiting_customer_confirmation', 'completed', 'cancelled', 'declined', 'no_rider_available'];
  if (!validStatuses.includes(status)) {
    throw new ResponseError('Invalid status', 400);
  }

  // Prevent invalid status 'arrived' - use 'awaiting_customer_confirmation' instead
  if (status === 'arrived') {
    throw new ResponseError('Invalid status. Use "awaiting_customer_confirmation" instead.', 400);
  }

  const ride = await RideRequest.findById(rideId);

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  // Only rider or customer can update status
  if (
    ride.rider?.toString() !== userId.toString() &&
    ride.customer.toString() !== userId.toString()
  ) {
    throw new ResponseError('Not authorized to update this ride', 403);
  }

  console.log('[RIDE STATUS TRANSITION]', {
    previousStatus: ride.status,
    newStatus: status,
    rideId: ride._id,
    userId: userId,
    event: 'ride_status_updated'
  });

  ride.status = status;
  if (status === 'completed') {
    ride.completedAt = new Date();
  } else if (status === 'in_progress') {
    ride.startedAt = new Date();
  }

  await ride.save();

  // Emit Socket.io event
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${ride.customer}`).emit('ride_status_update', {
      rideId: ride._id,
      status: ride.status,
    });

    if (status === 'awaiting_customer_confirmation') {
      io.to(`user_${ride.customer}`).emit('ride_awaiting_confirmation', {
        rideId: ride._id,
        message: 'Your rider has marked you as arrived. Please confirm your arrival.',
        ride,
      });
    }
  }

  // Create notification for customer
  try {
    await createRideNotification(ride.customer, ride, status, 'customer', req);
  } catch (err) {
    console.error('[Customer ride status notification failed]', err);
  }

  // Create notification for rider
  if (ride.rider) {
    try {
      await createRideNotification(ride.rider, ride, status, 'rider', req);
    } catch (err) {
      console.error('[Rider ride status notification failed]', err);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Ride status updated',
    data: ride,
  });
});

/**
 * Confirm ride completion (customer only)
 * Customer confirms they have arrived at destination
 * This releases payment to the rider from escrow
 */
export const confirmRideCompletion = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id;

  console.log("==== CUSTOMER ARRIVAL CONFIRMATION START ====");
  console.log({
    rideId: req.params.rideId,
    customer: req.user?._id,
    body: req.body,
    userRole: req.user?.role
  });

  const ride = await RideRequest.findById(rideId)
    .populate('customer', 'name email phone')
    .populate('rider')
    .populate('transaction');

  console.log("==== RIDE FOUND ====");
  console.log({
    rideFound: !!ride,
    rideId: ride?._id,
    rideStatus: ride?.status,
    ridePaymentStatus: ride?.paymentStatus,
    rideRider: ride?.rider?._id,
    rideCustomer: ride?.customer?._id,
    rideEscrowStatus: ride?.escrowStatus,
    rideFundsReleased: ride?.fundsReleased,
    rideCustomerConfirmedArrival: ride?.customerConfirmedArrival
  });

  if (!ride) {
    console.log("FAILED HERE: Ride not found - Line 664");
    throw new ResponseError('Ride not found', 404);
  }

  // Only the customer can confirm ride completion
  console.log("==== CUSTOMER OWNERSHIP CHECK ====");
  console.log({
    rideCustomerId: ride.customer._id.toString(),
    requestUserId: userId.toString(),
    match: ride.customer._id.toString() === userId.toString()
  });

  if (ride.customer._id.toString() !== userId.toString()) {
    console.log("FAILED HERE: Customer ownership check failed - Line 669");
    throw new ResponseError('Only the customer can confirm ride completion', 403);
  }

  // Ride must be awaiting customer confirmation (rider marked passenger arrived)
  console.log("==== RIDE STATUS CHECK ====");
  console.log({
    currentStatus: ride.status,
    expectedStatus: 'awaiting_customer_confirmation',
    matches: ride.status === 'awaiting_customer_confirmation'
  });

  if (ride.status !== 'awaiting_customer_confirmation') {
    console.log("FAILED HERE: Ride status check failed - Line 674");
    throw new ResponseError('Ride is not ready for arrival confirmation. Rider must mark passenger arrived first.', 400);
  }

  console.log("==== PAYMENT STATUS CHECK ====");
  console.log({
    paymentStatus: ride.paymentStatus,
    expectedPaymentStatus: 'paid',
    matches: ride.paymentStatus === 'paid'
  });

  // Payment must be paid before confirming arrival
  if (ride.paymentStatus !== 'paid') {
    console.log("FAILED HERE: Payment status check failed - Line 682");
    throw new ResponseError('Payment must be completed before confirming arrival', 400);
  }

  console.log('[RIDE STATUS TRANSITION]', {
    previousStatus: ride.status,
    newStatus: 'completed',
    rideId: ride._id,
    userId: userId,
    event: 'customer_confirmed_arrival',
    paymentStatus: ride.paymentStatus,
    escrowStatus: ride.escrowStatus
  });

  // Update ride to completed status
  ride.status = 'completed';
  ride.completedAt = new Date();
  ride.rideConfirmedByCustomer = true;
  ride.customerConfirmedAt = new Date();
  
  // ESCROW SYSTEM: Mark customer confirmed arrival and release funds
  ride.customerConfirmedArrival = true;
  ride.escrowStatus = 'released';
  ride.fundsReleased = true;
  ride.fundsReleasedAt = new Date();

  // Add to tracking history
  ride.trackingHistory.push({
    location: {
      type: 'Point',
      coordinates: ride.dropoffLocation?.coordinates?.coordinates || [0, 0],
    },
    timestamp: new Date(),
    status: 'completed',
  });

  await ride.save();

  console.log('[confirmRideCompletion] Ride completed and confirmed:', {
    rideId: ride._id,
    customerConfirmedArrival: ride.customerConfirmedArrival,
    escrowStatus: ride.escrowStatus,
    fundsReleased: ride.fundsReleased,
  });

  // Release payment to rider from escrow - update transaction
  if (ride.transaction) {
    const transaction = ride.transaction;
    if (transaction.status === 'paid') {
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();

      console.log('[confirmRideCompletion] Transaction completed:', transaction._id);

      const riderReceives = transaction.providerReceives || ride.fare?.riderReceives || 0;
      const riderId = ride.rider._id || ride.rider;
      await releaseEscrow(riderId, riderReceives, 'ride_arrival_confirmed');
      
      console.log('[confirmRideCompletion] Escrow released to rider:', { riderId, amount: riderReceives });
    }
  }

  // Notify rider about ride completion confirmation and payment release
  const io = req.app.get('io');
  if (io && ride.rider) {
    const riderId = ride.rider._id || ride.rider;
    io.to(`rider_${riderId}`).emit('ride_completed_confirmed', {
      rideId: ride._id,
      customer: ride.customer,
      confirmedAt: ride.customerConfirmedAt,
      message: 'Customer has confirmed arrival. Payment has been released to your wallet.',
    });

    // Emit payment released event
    io.to(`rider_${riderId}`).emit('payment_released', {
      rideId: ride._id,
      amount: ride.fare?.riderReceives || 0,
      releasedAt: ride.fundsReleasedAt,
    });
  }

  // Create notification for rider with payment release info
  if (ride.rider) {
    try {
      await createRideNotification(
        ride.rider,
        ride,
        'ride_completed',
        'rider',
        req,
        `Customer confirmed arrival. Payment of KSh ${ride.fare?.riderReceives || 0} has been released to your wallet.`
      );
    } catch (err) {
      console.error('[Rider completion notification failed]', err);
    }
  }

  // Create notification for customer
  try {
    await createRideNotification(
      ride.customer._id,
      ride,
      'ride_completed',
      'customer',
      req,
      'You have confirmed arrival. Payment has been released to the rider.'
    );
  } catch (err) {
    console.error('[Customer completion notification failed]', err);
  }

  res.status(200).json({
    success: true,
    message: 'Ride completion confirmed successfully. Payment has been released to the rider.',
    data: ride,
  });
});

/**
 * Update rider location in real-time
 */
export const updateRiderLocation = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { rideId, latitude, longitude } = req.body;

  if (!rideId) {
    throw new ResponseError('rideId is required', 400);
  }

  if (!latitude || !longitude) {
    throw new ResponseError('latitude and longitude are required', 400);
  }

  const ride = await RideRequest.findById(rideId);

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  if (ride.rider?.toString() !== riderId.toString()) {
    throw new ResponseError('Not authorized to update this ride', 403);
  }

  ride.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };

  await ride.save();

  // Emit Socket.io event to customer
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${ride.customer}`).emit('rider_location', {
      rideId: ride._id,
      latitude,
      longitude,
      timestamp: new Date(),
    });
  }

  res.status(200).json({
    success: true,
    message: 'Location updated',
  });
});

/**
 * Cancel ride
 */
export const cancelRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id;

  const ride = await RideRequest.findById(rideId);

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  if (
    ride.customer.toString() !== userId.toString() &&
    ride.rider?.toString() !== userId.toString()
  ) {
    throw new ResponseError('Not authorized to cancel this ride', 403);
  }

  if (ride.status === 'completed') {
    throw new ResponseError('Cannot cancel completed ride', 400);
  }

  console.log('[RIDE STATUS TRANSITION]', {
    previousStatus: ride.status,
    newStatus: 'cancelled',
    rideId: ride._id,
    userId: userId,
    event: 'ride_cancelled'
  });

  ride.status = 'cancelled';
  ride.cancelledAt = new Date();
  ride.cancelledBy = userId;
  await ride.save();

  res.status(200).json({
    success: true,
    message: 'Ride cancelled successfully',
    data: ride,
  });
});

/**
 * Archive ride (soft delete for customers)
 * PUT /api/rides/:rideId/archive
 */
export const archiveRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id;

  const ride = await RideRequest.findById(rideId);

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  // Only customer can archive their own rides
  if (ride.customer.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to archive this ride', 403);
  }

  // Only allow archiving of completed, cancelled, or declined rides
  const archivableStatuses = ['completed', 'cancelled', 'declined'];
  if (!archivableStatuses.includes(ride.status)) {
    throw new ResponseError(
      'Can only archive completed, cancelled, or declined rides. Active rides cannot be archived.',
      400
    );
  }

  // Soft delete - mark as hidden by customer
  ride.hiddenByCustomer = true;
  ride.archivedByCustomer = true;
  ride.isDeletedByCustomer = true;
  await ride.save();

  console.log('[RIDE ARCHIVED]', {
    rideId,
    status: ride.status,
    archivedBy: userId,
  });

  res.status(200).json({
    success: true,
    message: 'Ride archived successfully',
  });
});

/**
 * Delete ride for rider (soft delete)
 * DELETE /api/rides/:rideId/delete
 */
export const deleteRideForRider = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id;

  if (req.user.role !== 'rider') {
    throw new ResponseError('Only riders can delete rides', 403);
  }

  const ride = await RideRequest.findById(rideId);

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  // Only rider can delete their assigned rides
  if (ride.rider && ride.rider.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to delete this ride', 403);
  }

  // Only allow deleting of completed, cancelled, or declined rides
  const deletableStatuses = ['completed', 'cancelled', 'declined'];
  if (!deletableStatuses.includes(ride.status)) {
    throw new ResponseError(
      'Can only delete completed, cancelled, or declined rides. Active rides cannot be deleted.',
      400
    );
  }

  // Soft delete - mark as deleted by rider
  ride.isDeletedByRider = true;
  await ride.save();

  console.log('[RIDE DELETED BY RIDER]', {
    rideId,
    status: ride.status,
    deletedBy: userId,
  });

  res.status(200).json({
    success: true,
    message: 'Ride deleted successfully',
  });
});

/**
 * Calculate ride fare estimate
 * This is the single source of truth for fare calculation
 * Frontend should call this to get accurate fare before booking
 */
export const calculateRideFare = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, ratePerKm } = req.body;

  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  // Validate pickup location coordinates
  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates. Expected GeoJSON Point format', 400);
  }

  // Validate dropoff location coordinates
  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates. Expected GeoJSON Point format', 400);
  }

  // Calculate distance using routing API (or Haversine fallback)
  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);

  // Calculate fare using the centralized fare calculator. Fallback to default rates if ratePerKm is not provided.
  let fareBreakdown;
  if (ratePerKm !== undefined && ratePerKm !== null && !isNaN(ratePerKm) && ratePerKm > 0) {
    fareBreakdown = calculateFare(distanceInMeters, ratePerKm);
  } else {
    fareBreakdown = calculateFareWithDefaultRate(distanceInMeters);
  }

  // Format distance for display
  const formattedDistance = formatDistance(distanceInMeters);

  res.status(200).json({
    success: true,
    data: {
      // Distance info
      distanceInMeters: Math.round(distanceInMeters),
      distanceInKm: distanceToKm(distanceInMeters),
      distanceDisplay: formattedDistance,

      // Fare info
      ...fareBreakdown,

      // Pickup and dropoff info
      pickup: pickupLocation.address || pickupLocation.name || 'Pickup location',
      dropoff: dropoffLocation.address || dropoffLocation.name || 'Dropoff location',
    },
  });
});

/**
 * Calculate fare with a specific rider's rates
 * This is the single source of truth for fare calculation when a rider is selected
 */
export const calculateFareWithRider = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, riderId } = req.body;

  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  if (!riderId) {
    throw new ResponseError('Rider ID is required', 400);
  }

  // Validate coordinates
  if (!pickupLocation.coordinates || !Array.isArray(pickupLocation.coordinates.coordinates) || pickupLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid pickup location coordinates', 400);
  }

  if (!dropoffLocation.coordinates || !Array.isArray(dropoffLocation.coordinates.coordinates) || dropoffLocation.coordinates.coordinates.length !== 2) {
    throw new ResponseError('Invalid dropoff location coordinates', 400);
  }

  // Get rider's profile to get their rates
  const rider = await User.findById(riderId);
  if (!rider) {
    throw new ResponseError('Selected rider not found', 404);
  }

  if (rider.role !== 'rider') {
    throw new ResponseError('Selected user is not a rider', 400);
  }

  // Get rider's configured rates
  const dayRate = rider.riderProfile?.dayRatePerKm;
  const nightRate = rider.riderProfile?.nightRatePerKm;

  if (!dayRate || !nightRate || isNaN(dayRate) || isNaN(nightRate) || dayRate <= 0 || nightRate <= 0) {
    throw new ResponseError('Rider has not configured day/night rates', 400);
  }

  // Calculate distance
  const distanceInMeters = await getRoutingDistance(pickupLocation, dropoffLocation);

  // Calculate fare with rider's rates
  const fareBreakdown = calculateFareWithRiderRate(distanceInMeters, dayRate, nightRate);

  console.log('[calculateFareWithRider] Fare calculated:', {
    riderId,
    dayRate,
    nightRate,
    distanceInMeters,
    fareBreakdown,
  });

  res.status(200).json({
    success: true,
    data: fareBreakdown,
  });
});

/**
 * Get fare estimate with default rate
 * Used when rider rate is not yet known (before selecting a rider)
 */
export const getFareEstimate = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, time } = req.query;

  if (!pickupLocation || !dropoffLocation) {
    throw new ResponseError('Pickup and dropoff locations are required', 400);
  }

  // Parse coordinates from query params
  const pickup = {
    address: req.query.pickupAddress,
    coordinates: {
      type: 'Point',
      coordinates: [parseFloat(req.query.pickupLng), parseFloat(req.query.pickupLat)],
    },
  };

  const dropoff = {
    address: req.query.dropoffAddress,
    coordinates: {
      type: 'Point',
      coordinates: [parseFloat(req.query.dropoffLng), parseFloat(req.query.dropoffLat)],
    },
  };

  // Calculate distance
  const distanceInMeters = await getRoutingDistance(pickup, dropoff);

  // Calculate fare with default rate
  const options = {};
  if (time) {
    options.time = new Date(time);
  }

  const fareBreakdown = calculateFareWithDefaultRate(distanceInMeters, options);

  // Format distance for display
  const formattedDistance = formatDistance(distanceInMeters);

  res.status(200).json({
    success: true,
    data: {
      // Distance info
      distanceInMeters: Math.round(distanceInMeters),
      distanceInKm: distanceToKm(distanceInMeters),
      distanceDisplay: formattedDistance,

      // Fare info
      ...fareBreakdown,
    },
  });
});

/**
 * Decline a ride request (rider declines)
 * REQUIRES: mandatory reason field
 */
export const declineRide = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { rideId } = req.params;
  const { reason } = req.body;

  if (req.user.role !== 'rider') {
    throw new ResponseError('Only riders can decline rides', 403);
  }

  // Validate mandatory reason field
  if (!reason || reason.trim().length === 0) {
    throw new ResponseError('Reason for declining is required', 400);
  }

  const ride = await RideRequest.findById(rideId)
    .populate('customer', 'name email phone');

  if (!ride) {
    throw new ResponseError('Ride not found', 404);
  }

  if (ride.rider && ride.rider.toString() !== riderId) {
    throw new ResponseError('This ride has already been assigned to another rider', 400);
  }

  console.log('[RIDE STATUS TRANSITION]', {
    previousStatus: ride.status,
    newStatus: 'declined',
    rideId: ride._id,
    riderId: riderId,
    event: 'ride_declined'
  });

  // Update ride status to 'declined' (not 'cancelled')
  ride.status = 'declined';
  ride.cancelledBy = riderId;
  ride.cancelledAt = new Date();
  ride.cancellationReason = reason; // Store the actual reason provided
  await ride.save();

  console.log('[RIDE DECLINED]', {
    rideId: ride._id,
    riderId,
    reason,
    customerId: ride.customer._id,
  });

  // Emit Socket.io event to customer with reason
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${ride.customer._id}`).emit('ride_declined', {
      rideId: ride._id,
      riderId,
      reason,
      message: 'The rider declined your ride request.',
    });
  }

  // Create notification for customer with reason
  try {
    await createRideNotification(
      ride.customer._id,
      ride,
      'declined',
      'customer',
      req,
      `Your ride was declined. Reason: ${reason}`
    );
  } catch (err) {
    console.error('[Customer ride declined notification failed]', err);
  }

  res.status(200).json({
    success: true,
    message: 'Ride declined successfully',
    data: ride,
  });
});
