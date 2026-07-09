import User from '../models/User.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

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
  const { role, page = 1, limit = 10, search } = req.query;

  let query = {};

  if (role) {
    query.role = role;
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

  // Remove password from updates if present (use changePassword endpoint instead)
  if (updates.password) {
    delete updates.password;
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