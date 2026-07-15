import mongoose from 'mongoose';
console.log('Loading controllers/landlordController.js');
import Rental from '../models/Rental.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { getDashboardWalletData, getWalletPageData } from '../services/walletCalculationService.js';

/**
 * Dashboard Statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const landlordId = req.user._id;

  console.log('[LANDLORD DASHBOARD STATS] Fetching for landlord:', landlordId);

  // Get all rentals for this landlord
  const rentals = await Rental.find({
    landlord: landlordId,
  }).lean();

  const totalProperties = rentals.length;

  // Count available (vacant) and occupied properties
  const vacantProperties = rentals.filter(
    rental => rental.isAvailable
  ).length;

  const bookedRooms = totalProperties - vacantProperties;

  // Get transactions for earnings calculation - CURRENT MONTH ONLY
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  console.log('[LANDLORD DASHBOARD STATS] Monthly period:', {
    start: startOfMonth,
    end: endOfMonth
  });

  const completedTransactions = await Transaction.find({
    provider: landlordId,
    status: 'completed',
    type: 'rental',
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  }).lean();

  const pendingTransactions = await Transaction.find({
    provider: landlordId,
    status: 'paid',
    type: 'rental',
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  }).lean();

  // Calculate monthly earnings (rental only, no service-type)
  const monthlyEarnings = completedTransactions.reduce(
    (sum, t) => sum + (t.providerReceives || 0), 0
  );

  const pendingEarnings = pendingTransactions.reduce(
    (sum, t) => sum + (t.providerReceives || 0), 0
  );

  console.log('[LANDLORD DASHBOARD STATS] Monthly earnings:', {
    monthlyEarnings,
    pendingEarnings,
    completedCount: completedTransactions.length,
    pendingCount: pendingTransactions.length
  });

  // Get wallet data from centralized service
  const walletData = await getDashboardWalletData(landlordId, 'landlord');
  const availableBalance = walletData.availableBalance;
  const pendingBalance = walletData.pendingBalance;

  // Calculate total views
  const totalViews = rentals.reduce(
    (sum, rental) => sum + (rental.views || 0), 0
  );

  const averageViews = totalProperties > 0
    ? Math.round(totalViews / totalProperties)
    : 0;

  // Calculate dynamic active tenants
  const activeTenants = rentals.reduce((sum, rental) => {
    return sum + (rental.bookings?.filter(b => b.status === 'active').length || 0);
  }, 0);

  // Calculate all-time earnings
  const allCompletedTransactions = await Transaction.find({
    provider: landlordId,
    status: 'completed',
    type: 'rental',
  }).lean();

  const allTimeEarnings = allCompletedTransactions.reduce(
    (sum, t) => sum + (t.providerReceives || 0), 0
  );

  // Fetch rating from Landlord's profile
  const landlordUser = await User.findById(landlordId);
  const rating = landlordUser?.landlordProfile?.rating || 4.8;

  // Compute total reviews/bookings count
  const completedBookingsCount = rentals.reduce((sum, rental) => {
    return sum + (rental.bookings?.filter(b => b.status === 'completed' || b.status === 'active').length || 0);
  }, 0);
  const reviewsCount = completedBookingsCount || 0;

  // Calculate actual occupancy rate based on booked/total properties
  const bookedRoomsCount = rentals.reduce((sum, rental) => {
    return sum + (rental.bookings?.filter(b => b.status === 'active' || b.status === 'confirmed' || b.status === 'out_for_handover').length || 0);
  }, 0);
  const occupancyRate = totalProperties > 0 ? Math.round((bookedRoomsCount / totalProperties) * 100) : 0;

  console.log('[LANDLORD DASHBOARD DATA]', {
    landlordId,
    walletData,
    monthlyEarnings,
    pendingEarnings,
    allTimeEarnings,
    activeTenants,
    rating,
    reviewsCount,
    occupancyRate,
    completedCount: completedTransactions.length,
    pendingCount: pendingTransactions.length
  });

  res.status(200).json({
    success: true,
    data: {
      totalProperties,
      vacantProperties,
      bookedRooms,
      totalEarnings: allTimeEarnings, // All-time completed earnings
      monthlyEarnings, // Current month earnings
      pendingEarnings,
      availableBalance,
      pendingBalance,
      totalViews,
      averageViews,
      activeTenants,
      rating,
      reviewsCount,
      occupancyRate,
    },
  });
});

/**
 * Get Current Landlord Rentals
 */
export const getMyRentals = asyncHandler(async (req, res) => {
  const landlordId = req.user._id;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const skip = (page - 1) * limit;

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
      limit,
    },
  });
});

/**
 * Alias for compatibility
 */
export const getMyProperties = getMyRentals;

/**
 * Get Single Rental Owned By Current Landlord
 */
export const getMyRental = asyncHandler(async (req, res) => {
  const { rentalId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(rentalId)) {
    throw new ResponseError('Invalid rental ID', 400);
  }

  const rental = await Rental.findOne({
    _id: rentalId,
    landlord: req.user._id,
  }).populate(
    'landlord',
    'name email phone'
  );

  if (!rental) {
    throw new ResponseError(
      'Rental not found',
      404
    );
  }

  res.status(200).json({
    success: true,
    data: rental,
  });
});

/**
 * Toggle Rental Availability
 */
export const toggleAvailability = asyncHandler(
  async (req, res) => {
    const { rentalId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      throw new ResponseError(
        'Invalid rental ID',
        400
      );
    }

    const rental = await Rental.findById(rentalId);

    if (!rental) {
      throw new ResponseError(
        'Rental not found',
        404
      );
    }

    if (
      rental.landlord.toString() !==
      req.user._id.toString()
    ) {
      throw new ResponseError(
        'Not authorized to update this rental',
        403
      );
    }

    rental.isAvailable = !rental.isAvailable;

    await rental.save();

    res.status(200).json({
      success: true,
      message: `Rental marked as ${rental.isAvailable
        ? 'available'
        : 'unavailable'
        }`,
      data: rental,
    });
  }
);

/**
 * Get New Bookings for Landlord Dashboard
 * Returns pending bookings with customer phone numbers
 */
export const getNewBookings = asyncHandler(async (req, res) => {
  const landlordId = req.user._id;

  console.log('[LANDLORD NEW BOOKINGS] Fetching for landlord:', landlordId);

  // Get all rentals for this landlord
  const rentals = await Rental.find({ landlord: landlordId }).lean();

  // Extract all pending bookings from these rentals
  const newBookings = [];
  for (const rental of rentals) {
    for (const booking of rental.bookings) {
      if (booking.status === 'pending') {
        // Get customer details including phone
        const customer = await User.findById(booking.customer).select('name phone email').lean();

        newBookings.push({
          rentalId: rental._id,
          rentalName: rental.rentalName,
          rentalType: rental.rentalType,
          location: rental.location,
          monthlyPrice: rental.monthlyPrice,
          bookingId: booking._id,
          bookingDate: booking.bookedAt,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalPrice: booking.totalPrice,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          moveInDate: booking.moveInDate,
          customer: customer ? {
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email
          } : null,
        });
      }
    }
  }

  console.log('[LANDLORD NEW BOOKINGS] Found:', newBookings.length, 'pending bookings');

  res.status(200).json({
    success: true,
    data: newBookings,
  });
});

/**
 * Get All Bookings for Landlord
 * Returns all bookings (pending, accepted, active, completed, cancelled)
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const landlordId = req.user._id;

  console.log('[LANDLORD ALL BOOKINGS] Fetching for landlord:', landlordId);

  // Get all rentals for this landlord
  const rentals = await Rental.find({ landlord: landlordId }).lean();

  // Extract all bookings from these rentals
  const allBookings = [];
  for (const rental of rentals) {
    for (const booking of rental.bookings) {
      // Get customer details including phone
      const customer = await User.findById(booking.customer).select('name phone email').lean();

      allBookings.push({
        rentalId: rental._id,
        rentalName: rental.rentalName,
        rentalType: rental.rentalType,
        location: rental.location,
        monthlyPrice: rental.monthlyPrice,
        bookingId: booking._id,
        bookingDate: booking.bookedAt,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        escrowStatus: booking.escrowStatus || 'held',
        fundsReleased: booking.fundsReleased || false,
        moveInDate: booking.moveInDate,
        customer: customer ? {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email
        } : null,
      });
    }
  }

  // Sort by booking date (newest first)
  allBookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

  console.log('[LANDLORD ALL BOOKINGS] Found:', allBookings.length, 'total bookings');

  res.status(200).json({
    success: true,
    data: allBookings,
  });
});

/**
 * Get landlord wallet details
 */
export const getWallet = asyncHandler(async (req, res) => {
  const landlordId = req.user._id;

  // Get wallet data from centralized service
  const walletData = await getWalletPageData(landlordId, 'landlord');

  res.status(200).json({
    success: true,
    data: walletData,
  });
});