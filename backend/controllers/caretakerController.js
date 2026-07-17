import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import CaretakerInvitation from '../models/CaretakerInvitation.js';
import Rental from '../models/Rental.js';
import Notification from '../models/Notification.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Get Active Landlord ID for a user context
 */
export const getActiveLandlordId = (user) => {
  if (!user) return null;
  if (user.role === 'landlord') return user._id;
  if (user.role === 'caretaker' && user.caretakerProfile?.status === 'active') {
    return user.caretakerProfile.landlord;
  }
  return null;
};

/**
 * @desc    Generate Caretaker Invitation (Landlord only)
 * @route   POST /api/caretakers/invite
 * @access  Private (Landlord)
 */
export const generateInvitation = asyncHandler(async (req, res) => {
  const { caretakerName, caretakerPhone } = req.body;
  const landlordId = req.user._id;

  // Generate unique secure token
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await CaretakerInvitation.create({
    landlord: landlordId,
    token,
    caretakerName: caretakerName || '',
    caretakerPhone: caretakerPhone || '',
    status: 'pending',
    expiresAt,
  });

  // Construct sharing link
  const origin = req.headers.referer || req.headers.origin || 'https://connecthub.website';
  const parsedOrigin = new URL(origin).origin;
  const inviteLink = `${parsedOrigin}/caretaker/invite/${token}`;

  res.status(201).json({
    success: true,
    message: 'Invitation link generated successfully',
    data: {
      id: invitation._id,
      token,
      caretakerName: invitation.caretakerName,
      caretakerPhone: invitation.caretakerPhone,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviteLink,
    },
  });
});

/**
 * @desc    Get Invitation Details (Public)
 * @route   GET /api/caretakers/invite/:token
 * @access  Public
 */
export const getInvitationDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invitation = await CaretakerInvitation.findOne({ token })
    .populate('landlord', 'name email phone landlordProfile');

  if (!invitation) {
    throw new ResponseError('Invitation not found', 404);
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new ResponseError('This invitation link has expired', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ResponseError(`This invitation has already been ${invitation.status}`, 400);
  }

  res.status(200).json({
    success: true,
    data: {
      token: invitation.token,
      caretakerName: invitation.caretakerName,
      caretakerPhone: invitation.caretakerPhone,
      expiresAt: invitation.expiresAt,
      landlord: {
        id: invitation.landlord._id,
        name: invitation.landlord.name,
        email: invitation.landlord.email,
        phone: invitation.landlord.phone,
        propertyName: invitation.landlord.landlordProfile?.propertyName || 'Their Properties',
      },
    },
  });
});

/**
 * @desc    Register new user as caretaker and accept invitation
 * @route   POST /api/caretakers/invite/:token/register
 * @access  Public
 */
export const registerCaretakerAndAccept = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    throw new ResponseError('Please provide all required fields', 400);
  }

  const invitation = await CaretakerInvitation.findOne({ token });

  if (!invitation) {
    throw new ResponseError('Invitation not found', 404);
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new ResponseError('This invitation has expired', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ResponseError(`This invitation has already been ${invitation.status}`, 400);
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ResponseError('A user already exists with this email. Please log in to accept the invitation instead.', 400);
  }

  // Create new user as caretaker
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'caretaker',
    emailVerified: true, // Auto-verify email for caretaker invitation registrations
    isActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
    caretakerProfile: {
      landlord: invitation.landlord,
      status: 'active',
      invitedAt: invitation.createdAt,
      addedAt: new Date(),
    },
  });

  // Create wallet for caretaker
  await Wallet.create({ user: user._id });

  // Update invitation
  invitation.status = 'accepted';
  invitation.caretaker = user._id;
  await invitation.save();

  // Create notifications
  await Notification.create({
    user: invitation.landlord,
    type: 'system',
    notificationType: 'system',
    title: 'Caretaker Added',
    message: `${user.name} has accepted your invitation and is now a caretaker for your properties.`,
    status: 'unread',
  });

  // Generate JWT Token
  const jwtToken = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Caretaker registered and associated successfully',
    token: jwtToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
});

/**
 * @desc    Accept invitation for existing/logged-in user
 * @route   POST /api/caretakers/invite/:token/accept
 * @access  Private (Authenticated)
 */
export const acceptInvitationExisting = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const userId = req.user._id;

  const invitation = await CaretakerInvitation.findOne({ token });

  if (!invitation) {
    throw new ResponseError('Invitation not found', 404);
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new ResponseError('This invitation has expired', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ResponseError(`This invitation has already been ${invitation.status}`, 400);
  }

  // Update user role and caretaker profile
  const user = await User.findById(req.user._id);
  user.role = 'caretaker';
  user.onboardingCompleted = true;
  user.setupCompleted = true;
  user.caretakerProfile = {
    landlord: invitation.landlord,
    status: 'active',
    invitedAt: invitation.createdAt,
    addedAt: new Date(),
  };
  await user.save();

  // Update invitation
  invitation.status = 'accepted';
  invitation.caretaker = userId;
  await invitation.save();

  // Notify landlord
  await Notification.create({
    user: invitation.landlord,
    type: 'system',
    notificationType: 'system',
    title: 'Caretaker Added',
    message: `${user.name} has accepted your invitation and is now a caretaker for your properties.`,
    status: 'unread',
  });

  res.status(200).json({
    success: true,
    message: 'Invitation accepted successfully. You are now a Caretaker.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
});

/**
 * @desc    List Caretakers and Invitations (Landlord only)
 * @route   GET /api/caretakers
 * @access  Private (Landlord)
 */
export const listCaretakers = asyncHandler(async (req, res) => {
  const landlordId = req.user._id;

  // 1. Fetch Caretaker users
  const caretakers = await User.find({
    role: 'caretaker',
    'caretakerProfile.landlord': landlordId,
  }).select('name email phone caretakerProfile lastLogin createdAt');

  // 2. Fetch pending/expired/disabled invitations
  const invitations = await CaretakerInvitation.find({
    landlord: landlordId,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      caretakers: caretakers.map(c => ({
        id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        status: c.caretakerProfile?.status || 'active',
        addedAt: c.caretakerProfile?.addedAt || c.createdAt,
        lastActive: c.caretakerProfile?.lastActive || c.lastLogin || null,
      })),
      invitations: invitations.map(i => {
        const origin = req.headers.referer || req.headers.origin || 'https://connecthub.website';
        const parsedOrigin = new URL(origin).origin;
        return {
          id: i._id,
          token: i.token,
          caretakerName: i.caretakerName,
          caretakerPhone: i.caretakerPhone,
          status: i.expiresAt < new Date() && i.status === 'pending' ? 'expired' : i.status,
          expiresAt: i.expiresAt,
          inviteLink: `${parsedOrigin}/caretaker/invite/${i.token}`,
          createdAt: i.createdAt,
        };
      }),
    },
  });
});

/**
 * @desc    Remove Caretaker (Landlord only)
 * @route   DELETE /api/caretakers/:caretakerId
 * @access  Private (Landlord)
 */
export const removeCaretaker = asyncHandler(async (req, res) => {
  const { caretakerId } = req.params;
  const landlordId = req.user._id;

  const caretaker = await User.findOne({
    _id: caretakerId,
    role: 'caretaker',
    'caretakerProfile.landlord': landlordId,
  });

  if (!caretaker) {
    throw new ResponseError('Caretaker not found or does not belong to you', 404);
  }

  // Set caretaker role back to customer and remove profile
  caretaker.role = 'customer';
  caretaker.caretakerProfile = undefined;
  await caretaker.save();

  // Also update any invitations that were accepted by this caretaker
  await CaretakerInvitation.updateMany(
    { caretaker: caretakerId, landlord: landlordId },
    { status: 'disabled' }
  );

  res.status(200).json({
    success: true,
    message: 'Caretaker successfully removed and reset to standard customer role.',
  });
});

/**
 * @desc    Disable/Reactivate Caretaker (Landlord only)
 * @route   PATCH /api/caretakers/:caretakerId/status
 * @access  Private (Landlord)
 */
export const updateCaretakerStatus = asyncHandler(async (req, res) => {
  const { caretakerId } = req.params;
  const { status } = req.body;
  const landlordId = req.user._id;

  if (!['active', 'disabled'].includes(status)) {
    throw new ResponseError('Invalid status. Must be active or disabled.', 400);
  }

  const caretaker = await User.findOne({
    _id: caretakerId,
    role: 'caretaker',
    'caretakerProfile.landlord': landlordId,
  });

  if (!caretaker) {
    throw new ResponseError('Caretaker not found or does not belong to you', 404);
  }

  caretaker.caretakerProfile.status = status;
  await caretaker.save();

  res.status(200).json({
    success: true,
    message: `Caretaker status updated to ${status} successfully.`,
    data: {
      id: caretaker._id,
      name: caretaker.name,
      status: caretaker.caretakerProfile.status,
    },
  });
});

/**
 * @desc    Resend / Regenerate Invitation (Landlord only)
 * @route   POST /api/caretakers/:invitationId/resend
 * @access  Private (Landlord)
 */
export const resendInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const landlordId = req.user._id;

  const invite = await CaretakerInvitation.findOne({
    _id: invitationId,
    landlord: landlordId,
  });

  if (!invite) {
    throw new ResponseError('Invitation not found', 404);
  }

  // Extend expiration to 7 days from now and generate a fresh token
  const token = crypto.randomBytes(24).toString('hex');
  invite.token = token;
  invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  invite.status = 'pending';
  await invite.save();

  const origin = req.headers.referer || req.headers.origin || 'https://connecthub.website';
  const parsedOrigin = new URL(origin).origin;
  const inviteLink = `${parsedOrigin}/caretaker/invite/${token}`;

  res.status(200).json({
    success: true,
    message: 'Invitation regenerated successfully.',
    data: {
      id: invite._id,
      token,
      caretakerName: invite.caretakerName,
      caretakerPhone: invite.caretakerPhone,
      status: invite.status,
      expiresAt: invite.expiresAt,
      inviteLink,
    },
  });
});

/**
 * @desc    Get Caretaker Dashboard Stats (Caretaker only)
 * @route   GET /api/caretakers/dashboard/stats
 * @access  Private (Caretaker)
 */
export const getCaretakerDashboardStats = asyncHandler(async (req, res) => {
  const landlordId = getActiveLandlordId(req.user);

  if (!landlordId) {
    throw new ResponseError('No active landlord association found for this caretaker.', 403);
  }

  // Fetch landlord's properties
  const rentals = await Rental.find({ landlord: landlordId }).lean();
  const totalProperties = rentals.length;

  const vacantProperties = rentals.filter(r => r.isAvailable).length;
  const occupiedProperties = totalProperties - vacantProperties;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  // Extract bookings operational statistics
  const newBookings = [];
  const bookings = [];
  const activeTenants = [];
  const upcomingCheckins = [];
  const upcomingCheckouts = [];
  const rentDueReminders = [];

  const now = new Date();

  for (const rental of rentals) {
    for (const b of rental.bookings) {
      const customer = await User.findById(b.customer).select('name phone email').lean();
      const bookingData = {
        rentalId: rental._id,
        rentalName: rental.rentalName,
        location: rental.location,
        bookingId: b._id,
        bookedAt: b.bookedAt,
        startDate: b.bookingStartDate || b.moveInDate,
        nextRentDueDate: b.nextRentDueDate,
        totalPrice: b.totalPrice,
        status: b.status,
        paymentStatus: b.paymentStatus,
        customer: customer ? {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        } : null,
      };

      if (b.status === 'pending') {
        newBookings.push(bookingData);
      }

      bookings.push(bookingData);

      if (b.status === 'active') {
        if (customer) activeTenants.push({
          tenant: customer,
          rentalName: rental.rentalName,
          rentalId: rental._id,
          nextRentDueDate: b.nextRentDueDate,
        });

        // Rent reminders due
        if (b.nextRentDueDate && new Date(b.nextRentDueDate) <= now) {
          rentDueReminders.push({
            bookingId: b._id,
            rentalId: rental._id,
            rentalName: rental.rentalName,
            tenant: customer,
            dueDate: b.nextRentDueDate,
            monthlyPrice: rental.monthlyPrice,
          });
        }
      }

      if (b.status === 'confirmed' || b.status === 'out_for_handover') {
        upcomingCheckins.push(bookingData);
      }

      if (b.status === 'active' && b.nextRentDueDate && new Date(b.nextRentDueDate) <= new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)) {
        upcomingCheckouts.push(bookingData); // Approaching renewal/checkout
      }
    }
  }

  // Get notifications
  const notifications = await Notification.find({
    user: req.user._id,
    notificationType: 'rental',
  }).sort({ createdAt: -1 }).limit(10).lean();

  res.status(200).json({
    success: true,
    data: {
      totalProperties,
      vacantProperties,
      occupiedProperties,
      occupancyRate,
      newBookingsCount: newBookings.length,
      newBookings,
      activeTenants,
      upcomingCheckins,
      upcomingCheckouts,
      rentDueReminders,
      notifications,
    },
  });
});
