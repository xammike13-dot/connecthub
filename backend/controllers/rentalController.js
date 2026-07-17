import { v4 as uuidv4 } from 'uuid';
import Rental from '../models/Rental.js';
import Transaction from '../models/Transaction.js';
import { calculateRentalPayment } from '../utils/paymentCalculator.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { createRentalNotification } from './notificationController.js';
import { releaseEscrow, creditPendingEscrow } from '../utils/walletService.js';
import Wishlist from '../models/Wishlist.js';
import User from '../models/User.js';
import mpesaService from '../services/mpesaService.js';

const getActiveLandlordId = (user) => {
  if (!user) return null;
  if (user.role === 'landlord') return user._id;
  if (user.role === 'caretaker' && user.caretakerProfile?.status === 'active') {
    return user.caretakerProfile.landlord;
  }
  return null;
};

/**
 * Create Rental
 */
export const createRental = asyncHandler(async (req, res) => {
  if (req.user.role !== 'landlord' && req.user.role !== 'caretaker') {
    throw new ResponseError('Only landlords and caretakers can create rentals', 403);
  }

  const {
    rentalName,
    rentalType,
    monthlyPrice,
    location,
    amenities,
    description,
    images,
  } = req.body;

  if (
    !rentalName ||
    !rentalType ||
    !monthlyPrice ||
    !location
  ) {
    throw new ResponseError(
      'Please fill all required fields',
      400
    );
  }

  const landlordId = getActiveLandlordId(req.user);
  if (!landlordId) {
    throw new ResponseError('No associated active landlord found', 403);
  }

  const rental = await Rental.create({
    landlord: landlordId,
    rentalName,
    rentalType,
    monthlyPrice,
    location,
    amenities: amenities || [],
    description: description || '',
    images: images || [],
  });

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('rental_created', rental);
  }

  res.status(201).json({
    success: true,
    message: 'Rental created successfully',
    data: rental,
  });
});

/**
 * Get All Rentals
 */
export const getRentals = asyncHandler(async (req, res) => {
  const {
    rentalType,
    location,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {
    isAvailable: true,
  };

  if (rentalType) {
    query.rentalType = rentalType;
  }

  if (location) {
    query.location = location;
  }

  if (minPrice || maxPrice) {
    query.monthlyPrice = {};

    if (minPrice) {
      query.monthlyPrice.$gte = Number(minPrice);
    }

    if (maxPrice) {
      query.monthlyPrice.$lte = Number(maxPrice);
    }
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const rentals = await Rental.find(query)
    .populate('landlord', 'name email phone avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Rental.countDocuments(query);

  // Add user-specific state if authenticated
  let rentalsWithState = rentals;
  if (req.user && req.user.role === 'customer') {
    const userId = req.user._id;

    // Get user's wishlist
    const wishlist = await Wishlist.findOne({ customer: userId });
    const favoriteRentalIds = wishlist?.rentals.map(r => r.rental.toString()) || [];

    // Get user's viewed rentals
    const user = await User.findById(userId).select('customerProfile.viewedRentals');
    const viewedRentalIds = user?.customerProfile?.viewedRentals?.map(id => id.toString()) || [];

    // Add isFavorited and hasViewed to each rental
    rentalsWithState = rentals.map(rental => ({
      ...rental.toObject(),
      isFavorited: favoriteRentalIds.includes(rental._id.toString()),
      hasViewed: viewedRentalIds.includes(rental._id.toString()),
    }));
  }

  res.status(200).json({
    success: true,
    data: rentalsWithState,
    pagination: {
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    },
  });
});

/**
 * Track Rental View
 */
export const trackRentalView = asyncHandler(async (req, res) => {
  const rentalId = req.params.rentalId;
  const userId = req.user?._id;

  const rental = await Rental.findById(rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  let hasViewed = false;
  let viewCount = rental.views;

  // Track view for authenticated customer users
  if (userId && req.user.role === 'customer') {
    // Check if already viewed
    const user = await User.findById(userId).select('customerProfile.viewedRentals');
    hasViewed = user?.customerProfile?.viewedRentals?.some(id => id.toString() === rentalId) || false;

    // Increment view count and track view if not landlord's own rental
    if (rental.landlord.toString() !== userId.toString()) {
      if (!hasViewed) {
        // Add to viewed rentals
        await User.findByIdAndUpdate(userId, {
          $addToSet: { 'customerProfile.viewedRentals': rentalId }
        });
        hasViewed = true;
      }

      // Increment view count
      rental.views += 1;
      await rental.save();
      viewCount = rental.views;
    }
  } else if (!userId) {
    // Increment view count for non-authenticated users
    rental.views += 1;
    await rental.save();
    viewCount = rental.views;
  }

  res.status(200).json({
    success: true,
    data: {
      hasViewed,
      views: viewCount,
    },
  });
});

/**
 * Get Single Rental
 */
export const getRental = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.rentalId)
    .populate('landlord', 'name email phone avatar');

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  // Check favorited and viewed state (don't increment here)
  const userId = req.user?._id;
  let isFavorited = false;
  let hasViewed = false;

  if (userId && req.user.role === 'customer') {
    // Check if favorited
    const wishlist = await Wishlist.findOne({ customer: userId });
    isFavorited = wishlist?.rentals.some(r => r.rental.toString() === rental._id.toString()) || false;

    // Check if already viewed
    const user = await User.findById(userId).select('customerProfile.viewedRentals');
    hasViewed = user?.customerProfile?.viewedRentals?.some(id => id.toString() === rental._id.toString()) || false;
  }

  const rentalWithState = {
    ...rental.toObject(),
    isFavorited,
    hasViewed,
  };

  res.status(200).json({
    success: true,
    data: rentalWithState,
  });
});

/**
 * Update Rental
 */
export const updateRental = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  const landlordId = getActiveLandlordId(req.user);
  if (
    !landlordId ||
    rental.landlord.toString() !== landlordId.toString()
  ) {
    throw new ResponseError(
      'Not authorized to update this rental',
      403
    );
  }

  const allowedFields = [
    'rentalName',
    'rentalType',
    'monthlyPrice',
    'location',
    'amenities',
    'description',
    'images',
    'isAvailable',
  ];

  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedRental = await Rental.findByIdAndUpdate(
    req.params.rentalId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('rental_updated', updatedRental);
  }

  res.status(200).json({
    success: true,
    message: 'Rental updated successfully',
    data: updatedRental,
  });
});

/**
 * Delete Rental
 */
export const deleteRental = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  const landlordId = getActiveLandlordId(req.user);
  if (
    !landlordId ||
    rental.landlord.toString() !== landlordId.toString()
  ) {
    throw new ResponseError(
      'Not authorized to delete this rental',
      403
    );
  }

  const rentalId = rental._id;
  await rental.deleteOne();

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('rental_deleted', { rentalId });
  }

  res.status(200).json({
    success: true,
    message: 'Rental deleted successfully',
  });
});

/**
 * Get Rentals By Landlord
 */
export const getLandlordRentals = asyncHandler(async (req, res) => {
  const { landlordId } = req.params;

  const rentals = await Rental.find({
    landlord: landlordId,
  })
    .populate('landlord', 'name email phone')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: rentals,
  });
});

/**
 * Get Current Landlord Rentals
 */
export const getMyRentals = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const skip = (page - 1) * limit;

  const landlordId = getActiveLandlordId(req.user);
  if (!landlordId) {
    throw new ResponseError('No associated active landlord found', 403);
  }

  const rentals = await Rental.find({
    landlord: landlordId,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Rental.countDocuments({
    landlord: landlordId,
  });

  res.status(200).json({
    success: true,
    data: rentals,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    },
  });
});

/**
 * Toggle Availability
 */
export const toggleAvailability = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(
    req.params.rentalId
  );

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  const landlordId = getActiveLandlordId(req.user);
  if (
    !landlordId ||
    rental.landlord.toString() !== landlordId.toString()
  ) {
    throw new ResponseError(
      'Not authorized to update this rental',
      403
    );
  }

  rental.isAvailable = !rental.isAvailable;

  await rental.save();

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('rental_updated', rental);
  }

  res.status(200).json({
    success: true,
    message: `Rental marked as ${rental.isAvailable ? 'available' : 'unavailable'
      }`,
    data: rental,
  });
});

/**
 * Book a Rental (Customer)
 * Note: Dates are automatically set on payment confirmation
 */
export const bookRental = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { rentalId } = req.params;
  const { paymentMethod = 'mpesa' } = req.body;

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can book rentals', 403);
  }

  const rental = await Rental.findById(rentalId)
    .populate('landlord', 'name email phone');

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  if (!rental.isAvailable) {
    throw new ResponseError('This rental is no longer available', 400);
  }

  // Check if customer already has an active booking for this rental
  const hasActiveBooking = rental.bookings.some(booking =>
    booking.customer.toString() === customerId.toString() &&
    booking.status !== 'cancelled' &&
    booking.status !== 'completed'
  );

  if (hasActiveBooking) {
    throw new ResponseError('You already have an active booking for this rental', 400);
  }

  // Calculate total price for 1 month (default monthly rent)
  const months = 1;
  const basePrice = rental.monthlyPrice * months;
  const paymentBreakdown = calculateRentalPayment(rental.monthlyPrice, months);

  // Store the payment breakdown in the booking
  const totalPrice = paymentBreakdown.customerPays; // Customer pays base + their share

  // Create booking without dates - dates set on payment confirmation
  const booking = {
    customer: customerId,
    basePrice,
    totalPrice: paymentBreakdown.customerPays, // What customer pays
    platformFee: paymentBreakdown.platformFee,
    customerShare: paymentBreakdown.customerShare,
    providerShare: paymentBreakdown.providerShare,
    landlordReceives: paymentBreakdown.providerReceives,
    months,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'mpesa', // Required field - ConnectHub only supports M-Pesa
    escrowStatus: 'held', // Money will be held in escrow until move-in confirmed
    fundsReleased: false,
  };

  // Validate booking payload before creation
  console.log('[BOOKING PAYLOAD] Rental:', JSON.stringify({
    customer: booking.customer,
    totalPrice: booking.totalPrice,
    months: booking.months,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    escrowStatus: booking.escrowStatus,
    fundsReleased: booking.fundsReleased,
  }, null, 2));

  rental.bookings.push(booking);
  await rental.save();

  console.log('[BOOKING CREATED] Booking saved:', {
    bookingId: booking._id,
    rentalId,
    customerId,
    totalPrice: booking.totalPrice,
    escrowStatus: booking.escrowStatus,
    fundsReleased: booking.fundsReleased,
  });

  // Create notification for customer
  try {
    await createRentalNotification(customerId, rental, booking, 'booking_pending', 'customer', req);
  } catch (err) {
    console.error('[Customer rental booking notification failed]', err);
  }

  // Create notification for landlord
  try {
    await createRentalNotification(rental.landlord._id, rental, booking, 'new_booking', 'landlord', req);
  } catch (err) {
    console.error('[Landlord rental booking notification failed]', err);
  }

  console.log('[BOOK RENTAL] Notifications sent to customer and landlord');

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: {
      rental,
      booking: rental.bookings[rental.bookings.length - 1],
    },
  });
});

/**
 * Get My Bookings (Customer)
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  console.log('[CUSTOMER RENTALS QUERY]', {
    customerId,
    status,
    page,
    limit,
  });

  const skip = (page - 1) * limit;

  // Find rentals where the customer has bookings
  const query = {
    'bookings.customer': customerId,
  };

  if (status) {
    query['bookings.status'] = status;
  }

  console.log('[CUSTOMER RENTALS QUERY] MongoDB query:', JSON.stringify(query, null, 2));

  const rentals = await Rental.find(query)
    .populate('landlord', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  console.log('[CUSTOMER RENTALS QUERY] Found rentals:', rentals.length);

  // Filter bookings for this customer and exclude archived ones
  const bookings = rentals.map(rental => {
    const booking = rental.bookings.find(b =>
      b.customer.toString() === customerId.toString() && !b.hiddenByCustomer
    );
    return booking ? { rental, booking } : null;
  }).filter(b => b !== null);

  console.log('[CUSTOMER RENTALS RESULT]', {
    totalRentals: rentals.length,
    filteredBookings: bookings.length,
    bookings: bookings.map(b => ({
      bookingId: b.booking._id,
      rentalId: b.rental._id,
      status: b.booking.status,
      paymentStatus: b.booking.paymentStatus,
      escrowStatus: b.booking.escrowStatus,
      customer: b.booking.customer.toString(),
    })),
  });

  const total = await Rental.countDocuments(query);

  res.status(200).json({
    success: true,
    data: bookings,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Update Booking Status (Landlord)
 * Landlord can set status to 'out_for_handover' but not 'active' - customer must confirm move-in
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { rentalId, bookingId } = req.params;
  const { status, paymentStatus, declineReason } = req.body;

  console.log('[LANDLORD ACCEPTED BOOKING]', { rentalId, bookingId, status, paymentStatus, declineReason });

  if (req.user.role !== 'landlord' && req.user.role !== 'caretaker') {
    throw new ResponseError('Only landlords and caretakers can update booking status', 403);
  }

  const rental = await Rental.findById(rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  const landlordId = getActiveLandlordId(req.user);
  if (!landlordId || rental.landlord.toString() !== landlordId.toString()) {
    throw new ResponseError('Not authorized to update this booking', 403);
  }

  const booking = rental.bookings.id(bookingId);

  if (!booking) {
    throw new ResponseError('Booking not found', 404);
  }

  // Landlord can only set these statuses - 'active' requires customer move-in confirmation
  const validStatuses = ['pending', 'confirmed', 'out_for_handover', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    throw new ResponseError('Invalid status. Landlord cannot mark booking as active - customer must confirm move-in.', 400);
  }

  const validPaymentStatuses = ['pending', 'paid', 'refunded'];
  if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
    throw new ResponseError('Invalid payment status', 400);
  }

  // Require decline reason when cancelling
  if (status === 'cancelled' && !declineReason) {
    throw new ResponseError('Decline reason is required when cancelling a booking', 400);
  }

  if (status) booking.status = status;
  if (paymentStatus) booking.paymentStatus = paymentStatus;
  if (declineReason) booking.declineReason = declineReason;

  // Mark rental as unavailable if booking is confirmed or out_for_handover
  if (status === 'confirmed' || status === 'out_for_handover') {
    rental.isAvailable = false;
  }

  await rental.save();

  console.log('[LANDLORD ACCEPTED BOOKING] Booking updated:', { bookingId, status, declineReason });

  // Create notification for customer with appropriate message
  let notificationType = `booking_${status}`;
  let notificationMessage = `Your booking for ${rental.rentalName} has been ${status}.`;

  if (status === 'cancelled' && declineReason) {
    notificationMessage = `Your booking for ${rental.rentalName} was declined.\n\nReason: ${declineReason}`;
  } else if (status === 'confirmed') {
    notificationMessage = `Your rental booking for ${rental.rentalName} has been accepted. Please select your move-in date.`;
  }

  try {
    await createRentalNotification(booking.customer, rental, booking, notificationType, 'customer', req);
  } catch (err) {
    console.error('[Customer rental booking notification failed]', err);
  }

  // Notify customer via Socket.io if booking is out_for_handover
  if (status === 'out_for_handover') {
    const io = req.app.get('io');
    if (io && booking.customer) {
      const customerId = booking.customer._id || booking.customer;
      io.to(`user_${customerId}`).emit('rental_out_for_handover', {
        rentalId: rental._id,
        bookingId: booking._id,
        message: 'Your rental is ready for move-in. Please confirm to release payment to the landlord.',
        rental: rental,
        booking: booking,
      });
    }
  }

  // Emit socket notification for accept/decline
  const io = req.app.get('io');
  if (io && booking.customer) {
    const customerId = booking.customer._id || booking.customer;
    if (status === 'confirmed') {
      io.to(`user_${customerId}`).emit('booking_accepted', {
        rentalId: rental._id,
        bookingId: booking._id,
        message: notificationMessage,
        rental: rental.rentalName,
      });
    } else if (status === 'cancelled') {
      io.to(`user_${customerId}`).emit('booking_declined', {
        rentalId: rental._id,
        bookingId: booking._id,
        message: notificationMessage,
        rental: rental.rentalName,
        reason: declineReason,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `Booking updated to ${status}. ${status === 'out_for_handover' ? 'Customer must confirm move-in to complete the booking.' : ''}`,
    data: { rental, booking },
  });
});

/**
 * Set Move-In Date (Customer)
 * Customer selects their planned move-in date after landlord accepts booking
 */
export const setMoveInDate = asyncHandler(async (req, res) => {
  const { rentalId, bookingId } = req.params;
  const customerId = req.user._id;
  const { moveInDate } = req.body;

  console.log('[SET MOVE-IN DATE] Request:', { rentalId, bookingId, customerId, moveInDate });

  if (!moveInDate) {
    throw new ResponseError('Move-in date is required', 400);
  }

  const rental = await Rental.findById(rentalId)
    .populate('landlord', 'name email phone');

  if (!rental) {
    console.log('[SET MOVE-IN DATE] Rental not found:', rentalId);
    throw new ResponseError('Rental not found', 404);
  }

  const booking = rental.bookings.id(bookingId);

  if (!booking) {
    console.log('[SET MOVE-IN DATE] Booking not found:', bookingId);
    throw new ResponseError('Booking not found', 404);
  }

  // Only the customer can set their move-in date
  if (booking.customer.toString() !== customerId.toString()) {
    console.log('[SET MOVE-IN DATE] Unauthorized attempt:', { customerId, bookingCustomer: booking.customer });
    throw new ResponseError('Only the customer can set move-in date', 403);
  }

  // Booking must be accepted by landlord
  if (booking.status !== 'confirmed') {
    console.log('[SET MOVE-IN DATE] Invalid booking status:', booking.status);
    throw new ResponseError('Booking must be accepted by landlord before setting move-in date', 400);
  }

  // Set the move-in date
  booking.moveInDate = new Date(moveInDate);

  await rental.save();

  console.log('[SET MOVE-IN DATE] Move-in date set:', {
    bookingId,
    moveInDate: booking.moveInDate,
  });

  // Notify customer
  try {
    await createRentalNotification(customerId, rental, booking, 'move_in_date_set', 'customer', req);
  } catch (err) {
    console.error('[Customer move-in date notification failed]', err);
  }

  res.status(200).json({
    success: true,
    message: 'Move-in date set successfully. Please confirm when you have moved in.',
    data: { rental, booking },
  });
});

/**
 * Confirm Move-In (Customer)
 * Customer confirms they have moved in / received the rental
 * This releases payment from escrow to the landlord
 */
export const confirmMoveIn = asyncHandler(async (req, res) => {
  const { rentalId, bookingId } = req.params;
  const customerId = req.user._id;

  console.log('[CONFIRM MOVE-IN] Request:', { rentalId, bookingId, customerId });

  const rental = await Rental.findById(rentalId)
    .populate('landlord', 'name email phone');

  if (!rental) {
    console.log('[CONFIRM MOVE-IN] Rental not found:', rentalId);
    throw new ResponseError('Rental not found', 404);
  }

  const booking = rental.bookings.id(bookingId);

  if (!booking) {
    console.log('[CONFIRM MOVE-IN] Booking not found:', bookingId);
    throw new ResponseError('Booking not found', 404);
  }

  // Only the customer can confirm move-in
  if (booking.customer.toString() !== customerId.toString()) {
    console.log('[CONFIRM MOVE-IN] Unauthorized attempt:', { customerId, bookingCustomer: booking.customer });
    throw new ResponseError('Only the customer can confirm move-in', 403);
  }

  // Booking must be in a state where move-in can be confirmed
  const validConfirmationStatuses = ['confirmed', 'out_for_handover'];
  if (!validConfirmationStatuses.includes(booking.status)) {
    console.log('[CONFIRM MOVE-IN] Invalid booking status:', booking.status);
    throw new ResponseError('Booking is not ready for move-in confirmation', 400);
  }

  // Update booking to active status and release escrow
  booking.status = 'active';
  booking.moveInConfirmed = true;
  // Use the selected moveInDate if available, otherwise use current date
  if (!booking.moveInDate) {
    booking.moveInDate = new Date();
  }
  booking.moveInConfirmedBy = customerId;
  booking.moveInConfirmedAt = new Date();
  booking.escrowStatus = 'released';
  booking.fundsReleased = true;
  booking.fundsReleasedAt = new Date();

  // Set next rent due date (30 days from actual move-in date)
  const nextRentDue = new Date(booking.moveInDate);
  nextRentDue.setDate(nextRentDue.getDate() + 30);
  booking.nextRentDueDate = nextRentDue;

  // Set booking start date to the move-in date
  booking.bookingStartDate = booking.moveInDate;
  booking.lastRentPaymentDate = booking.moveInDate;

  await rental.save();

  console.log('[CONFIRM MOVE-IN] Booking updated to active:', {
    bookingId,
    nextRentDueDate: booking.nextRentDueDate,
    escrowStatus: booking.escrowStatus,
    fundsReleased: booking.fundsReleased,
  });

  // Release payment from escrow to landlord - update transaction
  if (booking.transaction) {
    const transaction = await Transaction.findById(booking.transaction);
    if (transaction && transaction.status === 'paid') {
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();

      console.log('[CONFIRM MOVE-IN] Transaction completed:', transaction._id);

      const providerReceives = transaction.providerReceives || booking.landlordReceives || booking.totalPrice;
      const landlordId = rental.landlord._id || rental.landlord;

      // Release to available balance (pending escrow already credited on payment success)
      await releaseEscrow(landlordId, providerReceives, 'rental_move_in_confirmed');
      console.log('[ESCROW RELEASED] Released to available balance:', { landlordId, amount: providerReceives });
    }
  }

  // Notify landlord about move-in confirmation
  const io = req.app.get('io');
  if (io && rental.landlord) {
    const landlordId = rental.landlord._id || rental.landlord;
    io.to(`user_${landlordId}`).emit('move_in_confirmed', {
      rentalId: rental._id,
      bookingId: booking._id,
      customer: booking.customer,
      confirmedAt: booking.moveInConfirmedAt,
      message: 'Customer has confirmed move-in. Funds have been released to your wallet.',
    });
  }

  // Create notification for landlord
  try {
    await createRentalNotification(rental.landlord, rental, booking, 'move_in_confirmed', 'landlord', req);
  } catch (err) {
    console.error('[Landlord move-in confirmation notification failed]', err);
  }

  // Create notification for customer
  try {
    await createRentalNotification(customerId, rental, booking, 'move_in_confirmed_success', 'customer', req);
  } catch (err) {
    console.error('[Customer move-in confirmation notification failed]', err);
  }

  console.log('[CUSTOMER MOVE-IN CONFIRMED] Notifications sent to landlord and customer');

  res.status(200).json({
    success: true,
    message: 'Move-in confirmed successfully. Funds have been released to the landlord.',
    data: { rental, booking },
  });
});

/**
 * Cancel Booking (Customer)
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const { rentalId, bookingId } = req.params;
  const customerId = req.user._id;

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can cancel bookings', 403);
  }

  const rental = await Rental.findById(rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  const booking = rental.bookings.id(bookingId);

  if (!booking) {
    throw new ResponseError('Booking not found', 404);
  }

  if (booking.customer.toString() !== customerId.toString()) {
    throw new ResponseError('Not authorized to cancel this booking', 403);
  }

  if (booking.status === 'confirmed') {
    throw new ResponseError('Cannot cancel confirmed bookings. Contact landlord.', 400);
  }

  booking.status = 'cancelled';
  await rental.save();

  // Check if rental should be marked available again
  const hasActiveBookings = rental.bookings.some(b => b.status !== 'cancelled');
  if (!hasActiveBookings) {
    rental.isAvailable = true;
    await rental.save();
  }

  // Create notification for landlord
  await createRentalNotification(rental.landlord, rental, booking, 'booking_cancelled', 'landlord', req);

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: { rental, booking },
  });
});

/**
 * Archive booking (soft delete for customers)
 * PUT /api/rentals/:rentalId/bookings/:bookingId/archive
 */
export const archiveBooking = asyncHandler(async (req, res) => {
  const { rentalId, bookingId } = req.params;
  const customerId = req.user._id;

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can archive bookings', 403);
  }

  const rental = await Rental.findById(rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  const booking = rental.bookings.id(bookingId);

  if (!booking) {
    throw new ResponseError('Booking not found', 404);
  }

  if (booking.customer.toString() !== customerId.toString()) {
    throw new ResponseError('Not authorized to archive this booking', 403);
  }

  // Only allow archiving of completed or cancelled bookings
  const archivableStatuses = ['completed', 'cancelled'];
  if (!archivableStatuses.includes(booking.status)) {
    throw new ResponseError(
      'Can only archive completed or cancelled bookings. Active bookings cannot be archived.',
      400
    );
  }

  // Soft delete - mark as hidden by customer
  booking.hiddenByCustomer = true;
  booking.archivedByCustomer = true;
  await rental.save();

  console.log('[BOOKING ARCHIVED]', {
    rentalId,
    bookingId,
    status: booking.status,
    archivedBy: customerId,
  });

  res.status(200).json({
    success: true,
    message: 'Booking archived successfully',
  });
});

/**
 * Toggle Rental Favorite (Add/Remove from Wishlist)
 */
export const toggleRentalFavorite = asyncHandler(async (req, res) => {
  const { rentalId } = req.params;
  const customerId = req.user._id;

  console.log('[TOGGLE RENTAL FAVORITE]', { rentalId, customerId });

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can favorite rentals', 403);
  }

  const rental = await Rental.findById(rentalId);

  if (!rental) {
    throw new ResponseError('Rental not found', 404);
  }

  // Find or create customer's wishlist
  let wishlist = await Wishlist.findOne({ customer: customerId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ customer: customerId, products: [], rentals: [] });
  }

  // Check if rental is already in wishlist
  const rentalIndex = wishlist.rentals.findIndex(
    (r) => r.rental.toString() === rentalId
  );

  let isFavorite = false;

  if (rentalIndex > -1) {
    // Remove from wishlist
    wishlist.rentals.splice(rentalIndex, 1);
    // Decrement favoritesCount
    await Rental.findByIdAndUpdate(rentalId, { $inc: { favoritesCount: -1 } });
    console.log('[RENTAL REMOVED FROM FAVORITES]', rentalId);
  } else {
    // Add to wishlist
    wishlist.rentals.push({ rental: rentalId });
    // Increment favoritesCount
    await Rental.findByIdAndUpdate(rentalId, { $inc: { favoritesCount: 1 } });
    isFavorite = true;
    console.log('[RENTAL ADDED TO FAVORITES]', rentalId);
  }

  await wishlist.save();

  // Get updated rental with new favoritesCount
  const updatedRental = await Rental.findById(rentalId);

  res.status(200).json({
    success: true,
    message: isFavorite ? 'Rental added to favorites' : 'Rental removed from favorites',
    isFavorite,
    data: {
      ...updatedRental.toObject(),
      isFavorited: isFavorite,
    },
  });
});

/**
 * Get Customer's Favorite Rentals
 */
export const getFavoriteRentals = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can view favorites', 403);
  }

  const wishlist = await Wishlist.findOne({ customer: customerId })
    .populate('rentals.rental')
    .lean();

  const favoriteRentals = wishlist?.rentals
    .map((item) => item.rental)
    .filter((rental) => rental !== null && rental !== undefined);

  res.status(200).json({
    success: true,
    data: favoriteRentals,
  });
});

/**
 * Send Monthly Rent Reminders
 * This function should be called by a scheduled job (e.g., cron)
 * Checks all active bookings and sends rent reminders if due
 */
export const sendRentReminders = asyncHandler(async (req, res) => {
  console.log('[RENT REMINDERS] Starting rent reminder check...');

  const now = new Date();

  // Find all rentals with active bookings
  const rentals = await Rental.find({
    'bookings.status': 'active',
    'bookings.paymentStatus': 'paid'
  }).lean();

  let remindersSent = 0;

  for (const rental of rentals) {
    for (const booking of rental.bookings) {
      if (booking.status === 'active' && booking.paymentStatus === 'paid') {
        // Check if reminder is due (nextRentDueDate is today or past, and not sent in last 7 days)
        const nextRentDue = booking.nextRentDueDate ? new Date(booking.nextRentDueDate) : null;
        const lastReminderSent = booking.lastRentReminderSent ? new Date(booking.lastRentReminderSent) : null;

        const isDue = nextRentDue && nextRentDue <= now;
        const recentlySent = lastReminderSent && (now - lastReminderSent) < (7 * 24 * 60 * 60 * 1000); // 7 days in ms

        if (isDue && !recentlySent) {
          // Send reminder notification
          await createRentalNotification(
            booking.customer,
            rental,
            booking,
            'rent_due',
            'customer',
            req
          );

          // Update last reminder sent date
          const rentalDoc = await Rental.findById(rental._id);
          const bookingDoc = rentalDoc.bookings.id(booking._id);
          bookingDoc.lastRentReminderSent = now;
          await rentalDoc.save();

          remindersSent++;
          console.log('[RENT REMINDER] Sent reminder for booking:', booking._id, 'Rental:', rental.rentalName);
        }
      }
    }
  }

  console.log('[RENT REMINDERS] Completed. Sent', remindersSent, 'reminders');

  res.status(200).json({
    success: true,
    message: `Rent reminders check completed. Sent ${remindersSent} reminders.`,
    remindersSent,
  });
});

/**
 * Pay Monthly Rent (Customer)
 * Customer pays monthly rent for an active booking
 */
export const payMonthlyRent = asyncHandler(async (req, res) => {
  const { rentalId, bookingId } = req.params;
  const customerId = req.user._id;

  console.log('[PAY MONTHLY RENT] Request:', { rentalId, bookingId, customerId });

  const rental = await Rental.findById(rentalId)
    .populate('landlord', 'name email phone');

  if (!rental) {
    console.log('[PAY MONTHLY RENT] Rental not found:', rentalId);
    throw new ResponseError('Rental not found', 404);
  }

  const booking = rental.bookings.id(bookingId);

  if (!booking) {
    console.log('[PAY MONTHLY RENT] Booking not found:', bookingId);
    throw new ResponseError('Booking not found', 404);
  }

  // Only the customer can pay rent
  if (booking.customer.toString() !== customerId.toString()) {
    console.log('[PAY MONTHLY RENT] Unauthorized attempt:', { customerId, bookingCustomer: booking.customer });
    throw new ResponseError('Only the customer can pay rent', 403);
  }

  // Booking must be active
  if (booking.status !== 'active') {
    console.log('[PAY MONTHLY RENT] Invalid booking status:', booking.status);
    throw new ResponseError('Booking must be active to pay rent', 400);
  }

  // Check if rent is due
  const today = new Date();
  const nextRentDue = booking.nextRentDueDate ? new Date(booking.nextRentDueDate) : null;
  if (!nextRentDue || nextRentDue > today) {
    console.log('[PAY MONTHLY RENT] Rent not due yet:', { nextRentDue, today });
    throw new ResponseError('Rent is not due yet', 400);
  }

  // Calculate payment amount
  const months = 1;
  const basePrice = rental.monthlyPrice * months;
  const paymentBreakdown = calculateRentalPayment(rental.monthlyPrice, months);

  const transactionRef = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Create a pending transaction for rent payment
  const transaction = await Transaction.create({
    transactionRef,
    customer: customerId,
    provider: rental.landlord._id,
    type: 'rental',
    status: 'pending',
    paymentMethod: 'mpesa',
    amount: {
      baseAmount: basePrice,
      deliveryFee: 0,
      platformFee: paymentBreakdown.platformFee,
      customerShare: paymentBreakdown.customerShare,
      providerShare: paymentBreakdown.providerShare,
      customerPays: paymentBreakdown.customerPays,
      providerReceives: paymentBreakdown.providerReceives,
      platformReceives: paymentBreakdown.platformReceives,
      totalAmount: paymentBreakdown.customerPays,
    },
    commission: {
      totalCommission: paymentBreakdown.platformFee,
      customerShare: paymentBreakdown.customerShare,
      providerShare: paymentBreakdown.providerShare,
      providerReceives: paymentBreakdown.providerReceives,
    },
    customerPaid: paymentBreakdown.customerPays,
    providerReceives: paymentBreakdown.providerReceives,
    relatedEntity: rental._id,
    relatedEntityType: 'rental',
    description: `Monthly rent payment for ${rental.rentalName}`,
    metadata: {
      bookingId: booking._id,
      isMonthlyRent: true,
    },
    pendingEntityData: {
      entityId: rental._id,
      bookingId: booking._id,
      isMonthlyRent: true,
    },
  });

  console.log('[PAY MONTHLY RENT] Transaction created:', transaction._id, 'Ref:', transactionRef);

  // Initiate M-Pesa payment
  const phone = req.user.phone;
  if (!phone) {
    throw new ResponseError('Phone number is required for payment', 400);
  }

  const paymentResponse = await mpesaService.initiateSTKPush({
    phoneNumber: phone,
    amount: paymentBreakdown.customerPays,
    transactionRef: transaction.transactionRef,
    description: `Monthly rent for ${rental.rentalName}`,
  });

  console.log('[PAY MONTHLY RENT] M-Pesa payment initiated:', paymentResponse);

  res.status(200).json({
    success: true,
    message: 'Monthly rent payment initiated',
    data: {
      transaction: transaction.transactionRef,
      amount: paymentBreakdown.customerPays,
      merchantRequestID: paymentResponse.MerchantRequestID,
      checkoutRequestID: paymentResponse.CheckoutRequestID,
    },
  });
});
