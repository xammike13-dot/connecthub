import User from '../models/User.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { getIO } from '../utils/socket.js';

/**
 * Get service providers by type (rider, etc.)
 * This endpoint returns online providers with their location info
 */
export const getProviders = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { latitude, longitude, maxDistance = 10000 } = req.query;

  console.log(`[getProviders] type=${type}, lat=${latitude}, lng=${longitude}, maxDistance=${maxDistance}`);

  // Map provider type to user role
  const roleMap = {
    rider: 'rider',
  };

  const role = roleMap[type];
  if (!role) {
    throw new ResponseError(`Provider type "${type}" not supported`, 400);
  }

  // Build query for online providers
  let query = {
    role: role,
    'riderProfile.isOnline': true,
  };

  // If coordinates provided, filter by distance
  if (latitude && longitude) {
    query['riderProfile.currentLocation'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: parseInt(maxDistance),
      },
    };
  }

  console.log('[getProviders] Query:', JSON.stringify(query, null, 2));

  // Find providers
  const providers = await User.find(query)
    .select('name phone avatar email riderProfile');

  console.log(`[getProviders] Found ${providers.length} providers`);

  // Log provider details for debugging
  providers.forEach((p, i) => {
    console.log(`[getProviders] Provider ${i}: name=${p.name}, isOnline=${p.riderProfile?.isOnline}, location=`, p.riderProfile?.currentLocation);
  });

  // Calculate distance and format response
  const providersWithDistance = providers.map(provider => {
    const loc = provider.riderProfile?.currentLocation;
    let distance = null;

    if (loc && loc.coordinates && latitude && longitude) {
      const providerLng = loc.coordinates[0];
      const providerLat = loc.coordinates[1];
      const customerLng = parseFloat(longitude);
      const customerLat = parseFloat(latitude);

      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (customerLat - providerLat) * Math.PI / 180;
      const dLng = (customerLng - providerLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(providerLat * Math.PI / 180) *
          Math.cos(customerLat * Math.PI / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance = R * c;
    }

    return {
      _id: provider._id,
      name: provider.name,
      phone: provider.phone,
      avatar: provider.avatar,
      email: provider.email,
      rating: provider.riderProfile?.rating || 0,
      vehicleType: provider.riderProfile?.vehicleType,
      vehicleNumber: provider.riderProfile?.vehicleNumber,
      isOnline: provider.riderProfile?.isOnline || false,
      status: provider.riderProfile?.status || 'offline',
      workingArea: provider.riderProfile?.workingArea,
      distance: distance ? parseFloat(distance.toFixed(2)) : null,
      lat: loc ? loc.coordinates[1] : null,
      lng: loc ? loc.coordinates[0] : null,
      lastLocationUpdate: provider.riderProfile?.lastLocationUpdate,
    };
  });

  // Sort by distance if available
  if (latitude && longitude) {
    providersWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }

  console.log(`[getProviders] Returning ${providersWithDistance.length} providers with distance info`);

  res.status(200).json({
    success: true,
    data: providersWithDistance,
    count: providersWithDistance.length,
  });
});

/**
 * Get all users (admin only)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 50, search, applicationStatus, roleApplicationStatus } = req.query;

  let query = {};

  if (role) {
    query.role = role;
  }

  const appStatus = applicationStatus || roleApplicationStatus;
  if (appStatus) {
    query['roleApplication.status'] = appStatus;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort('-createdAt');

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
  });
});

/**
 * Get user by ID
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Restrict access to: Admin, or the user's own profile
  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    throw new ResponseError('Not authorized to access this user profile', 403);
  }

  const user = await User.findById(id).select('-password');

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Restrict access to: Admin, or the user's own profile
  if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
    throw new ResponseError('Not authorized to update this user profile', 403);
  }

  // Remove password from updates if present (use changePassword endpoint instead)
  if (updates.password) {
    delete updates.password;
  }

  // Strip sensitive administrative fields for non-admin updates to block Privilege Escalation
  if (req.user.role !== 'admin') {
    delete updates.role;
    delete updates.isActive;
    delete updates.isDeleted;
    delete updates.emailVerified;
    delete updates.phoneVerified;
    delete updates.accountActive;
  }

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

/**
 * Delete user
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * Approve vendor application (admin only)
 */
export const approveVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  if (user.role !== 'business') {
    throw new ResponseError('User is not registered as a business/vendor', 400);
  }

  if (!user.businessProfile) {
    user.businessProfile = {};
  }

  user.businessProfile.isApproved = true;
  user.isVerified = true;
  user.accountActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: `Vendor "${user.businessProfile.businessName || user.name}" has been approved successfully.`,
    data: user,
  });
});


/**
 * Customer Endpoint: Apply for a partner role
 * POST /api/users/apply-role
 */
export const applyRole = asyncHandler(async (req, res) => {
  const { requestedRole, details } = req.body;

  const validRoles = ['rider', 'business', 'landlord', 'assistant'];
  if (!requestedRole || !validRoles.includes(requestedRole)) {
    throw new ResponseError(
      `Invalid requested role "${requestedRole}". Valid options are: ${validRoles.join(', ')}`,
      400
    );
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  // Prevent duplicate submissions if already pending
  if (user.roleApplication && user.roleApplication.status === 'pending') {
    throw new ResponseError(
      `You already have an active pending application for ${user.roleApplication.requestedRole}. Please wait for admin review.`,
      400
    );
  }

  const trimmedDetails = details && typeof details === 'object' ? { ...details } : {};

  // Validate role-specific details
  if (requestedRole === 'rider') {
    if (!trimmedDetails.primaryStage) {
      throw new ResponseError('Primary stage is required for rider applications (e.g., Kesses, Stage, Mabs)', 400);
    }
    if (!trimmedDetails.isFootRunner && !trimmedDetails.bikePlate) {
      throw new ResponseError('Bike plate registration number or foot runner option is required', 400);
    }
  } else if (requestedRole === 'business') {
    if (!trimmedDetails.businessName) {
      throw new ResponseError('Business or shop name is required for vendor applications', 400);
    }
    if (!trimmedDetails.campusLocation) {
      throw new ResponseError('Campus location is required (e.g., Stage, Kesses, Chebarus)', 400);
    }
  } else if (requestedRole === 'landlord') {
    if (!trimmedDetails.propertyName) {
      throw new ResponseError('Property or hostel name is required for landlord applications', 400);
    }
    if (!trimmedDetails.location) {
      throw new ResponseError('Property location is required', 400);
    }
  } else if (requestedRole === 'assistant') {
    if (!trimmedDetails.yearOfStudy && !trimmedDetails.campusArea) {
      throw new ResponseError('Year of study or campus area is required for campus assistants', 400);
    }
  }

  // Save the application
  user.roleApplication = {
    requestedRole,
    status: 'pending',
    details: trimmedDetails,
    appliedAt: new Date(),
    reviewedAt: null,
  };

  await user.save();

  // Real-time socket alert to admin_channel
  const io = getIO();
  if (io) {
    io.to('admin_channel').emit('admin:new_application', {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      requestedRole,
      details: trimmedDetails,
      appliedAt: user.roleApplication.appliedAt,
    });
  }

  res.status(200).json({
    success: true,
    message: `Your application to join Olafasta as a ${requestedRole} has been submitted successfully!`,
    data: {
      roleApplication: user.roleApplication,
      role: user.role,
    },
  });
});

/**
 * Admin Endpoint: Review role application
 * PATCH /api/users/:id/review-role
 */
export const reviewRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;

  if (!action || !['approve', 'reject'].includes(action)) {
    throw new ResponseError('Action must be either "approve" or "reject"', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ResponseError('User not found', 404);
  }

  if (!user.roleApplication || user.roleApplication.status !== 'pending') {
    throw new ResponseError('User does not have an active pending role application', 400);
  }

  const requestedRole = user.roleApplication.requestedRole;
  const details = user.roleApplication.details || {};

  if (action === 'approve') {
    user.role = requestedRole;
    user.roleApplication.status = 'approved';
    user.roleApplication.reviewedAt = new Date();
    if (notes) user.roleApplication.notes = notes;

    // Apply metadata to specific profiles
    if (requestedRole === 'business') {
      if (!user.businessProfile) user.businessProfile = {};
      user.businessProfile.isApproved = true;
      if (details.businessName) user.businessProfile.businessName = details.businessName;
      if (details.campusLocation) user.businessProfile.campusLocation = details.campusLocation;
      if (details.mpesaNumber) user.businessProfile.mpesaB2CPhone = details.mpesaNumber;
      if (details.category) user.businessProfile.businessCategory = details.category;
    } else if (requestedRole === 'rider') {
      if (!user.riderProfile) user.riderProfile = {};
      user.riderProfile.vehicleType = details.isFootRunner ? 'Foot Runner' : 'Motorcycle';
      if (details.bikePlate) user.riderProfile.vehicleNumber = details.bikePlate;
      if (details.primaryStage) {
        user.riderProfile.workingArea = {
          ...user.riderProfile.workingArea,
          town: details.primaryStage,
        };
      }
    } else if (requestedRole === 'landlord') {
      if (!user.landlordProfile) user.landlordProfile = {};
      if (details.propertyName) user.landlordProfile.propertyName = details.propertyName;
      if (details.location) user.landlordProfile.propertyLocation = details.location;
    } else if (requestedRole === 'assistant') {
      if (!user.assistantProfile) user.assistantProfile = {};
      user.assistantProfile.status = 'active';
    }

    user.onboardingCompleted = true;
    user.setupCompleted = true;
    user.isVerified = true;
    user.accountActive = true;
    await user.save();

    const targetDashboard =
      requestedRole === 'business' ? '/business/dashboard' :
      requestedRole === 'rider' ? '/rider/dashboard' :
      requestedRole === 'landlord' ? '/landlord/dashboard' :
      requestedRole === 'assistant' ? '/assistant/dashboard' : '/customer/dashboard';

    // Socket notification to user
    const io = getIO();
    if (io) {
      io.to(`user_${user._id}`).emit('role:approved', {
        role: user.role,
        requestedRole,
        name: user.name,
        dashboardUrl: targetDashboard,
        message: `Congratulations! Your Olafasta ${requestedRole} account is now active.`,
      });
      io.to(`user_${user._id}`).emit('role:updated', {
        role: user.role,
        status: 'approved',
        message: `Congratulations! Your application to become an Olafasta ${requestedRole} has been approved.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${user.name} approved as ${requestedRole} successfully.`,
      data: user,
    });
  } else {
    user.roleApplication.status = 'rejected';
    user.roleApplication.reviewedAt = new Date();
    if (notes) user.roleApplication.notes = notes;
    await user.save();

    const io = getIO();
    if (io) {
      io.to(`user_${user._id}`).emit('role:updated', {
        role: user.role,
        status: 'rejected',
        message: 'Your partner application could not be approved at this time. Please contact Olafasta support for details.',
      });
    }

    res.status(200).json({
      success: true,
      message: `Application for ${user.name} has been rejected.`,
      data: user,
    });
  }
});
