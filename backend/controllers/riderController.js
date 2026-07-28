import User from '../models/User.js';
import RideRequest from '../models/RideRequest.js';
import Wallet from '../models/Wallet.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Get rider dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  // Get all rides for this rider
  const rides = await RideRequest.find({ rider: riderId });
  const totalTrips = rides.length;

  // Count completed trips
  const completedTrips = rides.filter(r => r.status === 'completed').length;

  // Count pending (accepted but not started) trips
  const pendingTrips = rides.filter(r => r.status === 'accepted').length;

  // Count cancelled trips
  const cancelledTrips = rides.filter(r => r.status === 'cancelled').length;

  // Count trips completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripsToday = rides.filter(r => 
    r.status === 'completed' && new Date(r.completedAt || r.createdAt) >= today
  ).length;

  // Get wallet info - this is the single source of truth for earnings
  let wallet = await Wallet.findOne({ user: riderId });
  
  // Create wallet if it doesn't exist
  if (!wallet) {
    wallet = await Wallet.create({ user: riderId });
  }

  // Earnings come from wallet, not ride fare calculations
  const totalEarnings = wallet.totalEarnings || 0;
  const pendingEarnings = wallet.pendingBalance || 0;
  const claimableBalance = wallet.balance || 0;
  const withdrawnAmount = wallet.totalWithdrawn || 0;

  // Calculate dynamic rider rating
  const ratingRides = rides.filter(r => r.rating?.riderRating);
  const averageRating = ratingRides.length > 0
    ? parseFloat((ratingRides.reduce((sum, r) => sum + r.rating.riderRating, 0) / ratingRides.length).toFixed(1))
    : parseFloat(req.user.riderProfile?.rating || 5.0);

  // Compute total reviews/customer feedback
  const customerFeedbackRides = rides.filter(r => r.rating?.customerFeedback);
  const reviewsCount = customerFeedbackRides.length;
  const reviews = customerFeedbackRides.map(r => ({
    rating: r.rating?.riderRating,
    feedback: r.rating?.customerFeedback,
    date: r.completedAt || r.createdAt,
  }));

  // Fetch count of ride requests waiting for a rider (pending requests in system)
  const rideRequestsCount = await RideRequest.countDocuments({ status: 'waiting_rider' });

  // Calculate total distance travelled in km
  const totalDistance = rides
    .filter(r => r.status === 'completed' && (r.estimatedDistance || r.fare?.distanceInKm))
    .reduce((sum, r) => sum + (r.estimatedDistance || r.fare?.distanceInKm || 0), 0);

  const distanceTravelled = parseFloat(totalDistance.toFixed(1));

  // Get recent completed rides (last 5) with proper field mapping
  const recentRides = rides
    .filter(r => r.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
    .slice(0, 5)
    .map(ride => ({
      _id: ride._id,
      customer: ride.customer,
      pickupLocation: ride.pickupLocation?.address || 'Unknown',
      dropoffLocation: ride.dropoffLocation?.address || 'Unknown',
      fare: ride.fare?.riderReceives || ride.fare?.totalFare || 0,
      status: ride.status,
      createdAt: ride.createdAt,
      completedAt: ride.completedAt,
    }));

  res.status(200).json({
    success: true,
    data: {
      totalTrips,
      completedTrips,
      pendingTrips,
      cancelledTrips,
      tripsToday,
      totalEarnings,
      pendingEarnings,
      claimableBalance,
      withdrawnAmount,
      rating: averageRating,
      reviewsCount,
      reviews,
      rideRequestsCount,
      distanceTravelled,
      isOnline: req.user.riderProfile?.isOnline || false,
      status: req.user.riderProfile?.status || 'offline',
      recentRides,
    },
  });
});

/**
 * Get rider earnings trend analytics
 * Groups completed rides by day for the specified period
 * Includes days with 0 earnings to fill gaps
 */
export const getEarningsTrend = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { period = '7d' } = req.query;

  // Calculate date range based on period
  const now = new Date();
  let startDate, endDate = now;
  let dateFormat = '%Y-%m-%d';

  switch (period) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
      break;
    case '30d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29); // Last 30 days including today
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
  }

  // MongoDB aggregation pipeline to group earnings by day
  const trendData = await RideRequest.aggregate([
    // Match completed rides for this rider within the date range
    {
      $match: {
        rider: riderId,
        status: 'completed',
        customerConfirmedArrival: true,
        fundsReleased: true,
        completedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    // Group by day
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$completedAt',
          },
        },
        totalEarnings: {
          $sum: '$fare.riderReceives',
        },
        rideCount: {
          $sum: 1,
        },
      },
    },
    // Sort by date ascending
    {
      $sort: {
        _id: 1,
      },
    },
    // Format the output
    {
      $project: {
        date: '$_id',
        earnings: '$totalEarnings',
        rideCount: '$rideCount',
        _id: 0,
      },
    },
  ]);

  // Fill in missing days with 0 earnings
  const filledTrendData = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const existingData = trendData.find(item => item.date === dateStr);
    
    filledTrendData.push({
      date: dateStr,
      earnings: existingData ? existingData.earnings : 0,
      rideCount: existingData ? existingData.rideCount : 0,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate summary statistics
  const earnings = filledTrendData.map(d => d.earnings);
  const highestEarning = Math.max(...earnings);
  const lowestEarning = Math.min(...earnings);
  const averageEarning = earnings.length > 0 
    ? earnings.reduce((a, b) => a + b, 0) / earnings.length 
    : 0;

  res.status(200).json({
    success: true,
    data: {
      period,
      startDate,
      endDate,
      trend: filledTrendData,
      summary: {
        highest: highestEarning,
        lowest: lowestEarning,
        average: averageEarning,
      },
    },
  });
});

/**
 * Get rider profile
 */
export const getRiderProfile = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  const rider = await User.findById(riderId).select('-password');

  if (!rider) {
    throw new ResponseError('Rider not found', 404);
  }

  // Get wallet info
  let wallet = await Wallet.findOne({ user: riderId });
  if (!wallet) {
    wallet = await Wallet.create({ user: riderId });
  }

  res.status(200).json({
    success: true,
    data: {
      user: rider,
      wallet: {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
      },
    },
  });
});

/**
 * Update rider profile
 */
export const updateRiderProfile = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  console.log('[riderController] ========== PROFILE UPDATE REQUEST START ==========');
  console.log('[riderController] User ID:', riderId);
  console.log('[riderController] Request body:', JSON.stringify(req.body, null, 2));

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[riderController] Cloudinary configured');

  // Get current rider to check for existing photos
  const currentRider = await User.findById(riderId);
  if (!currentRider) {
    throw new ResponseError('Rider not found', 404);
  }

  const updates = {};
  
  // Handlers for root-level fields
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.email !== undefined) updates.email = req.body.email;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;

  // Process nested riderProfile updates using dot notation to prevent overwriting other fields
  if (req.body.riderProfile) {
    const profileFields = ['vehicleType', 'vehicleNumber', 'licenseNumber', 'nationalId', 
                          'workingArea', 'workingHours', 'dayRatePerKm', 'nightRatePerKm',
                          'profilePhoto', 'profilePhotoPublicId', 'motorcycle'];
    
    for (const field of profileFields) {
      if (req.body.riderProfile[field] !== undefined) {
        let value = req.body.riderProfile[field];
        
        // Convert numeric fields to numbers
        if (field === 'dayRatePerKm' || field === 'nightRatePerKm') {
          if (typeof value === 'string') {
            value = parseFloat(value);
          }
          if (isNaN(value) || value <= 0) {
            throw new ResponseError(`${field} must be a positive number`, 400);
          }
        }
        
        // Handle Cloudinary cleanup for profile photo replacement
        if (field === 'profilePhoto' && value && currentRider.riderProfile?.profilePhotoPublicId) {
          if (value !== currentRider.riderProfile.profilePhoto) {
            try {
              await cloudinary.uploader.destroy(currentRider.riderProfile.profilePhotoPublicId);
              console.log('[riderController] Deleted old profile photo from Cloudinary:', currentRider.riderProfile.profilePhotoPublicId);
            } catch (error) {
              console.error('[riderController] Failed to delete old profile photo:', error);
            }
          }
        }
        
        // Handle Cloudinary cleanup for motorcycle photo replacement
        if (field === 'motorcycle' && value?.photo && currentRider.riderProfile?.motorcycle?.photoPublicId) {
          if (value.photo !== currentRider.riderProfile.motorcycle?.photo) {
            try {
              await cloudinary.uploader.destroy(currentRider.riderProfile.motorcycle.photoPublicId);
              console.log('[riderController] Deleted old motorcycle photo from Cloudinary:', currentRider.riderProfile.motorcycle.photoPublicId);
            } catch (error) {
              console.error('[riderController] Failed to delete old motorcycle photo:', error);
            }
          }
        }

        // Apply using dot notation
        if (field === 'motorcycle' && value && typeof value === 'object') {
          const motorcycleFields = ['brand', 'model', 'plateNumber', 'color', 'year', 'photo', 'photoPublicId'];
          for (const subField of motorcycleFields) {
            if (value[subField] !== undefined) {
              updates[`riderProfile.motorcycle.${subField}`] = value[subField];
            }
          }
        } else if (field === 'workingArea' && value && typeof value === 'object') {
          const areaFields = ['county', 'town', 'serviceRadius'];
          for (const subField of areaFields) {
            if (value[subField] !== undefined) {
              updates[`riderProfile.workingArea.${subField}`] = value[subField];
            }
          }
        } else if (field === 'workingHours' && value && typeof value === 'object') {
          const hoursFields = ['start', 'end'];
          for (const subField of hoursFields) {
            if (value[subField] !== undefined) {
              updates[`riderProfile.workingHours.${subField}`] = value[subField];
            }
          }
        } else {
          updates[`riderProfile.${field}`] = value;
        }

        // Sync profilePhoto to root fields
        if (field === 'profilePhoto' && value) {
          updates.avatar = value;
          updates.profilePhoto = value;
        }
        if (field === 'profilePhotoPublicId' && value) {
          updates.profilePhotoPublicId = value;
        }
      }
    }
  }

  // Validate dayRatePerKm if provided
  if (updates['riderProfile.dayRatePerKm'] !== undefined) {
    const dayRate = updates['riderProfile.dayRatePerKm'];
    if (dayRate === null || dayRate === undefined || isNaN(dayRate) || dayRate <= 0) {
      throw new ResponseError('Day rate must be a positive number greater than 0', 400);
    }
  }

  // Validate nightRatePerKm if provided
  if (updates['riderProfile.nightRatePerKm'] !== undefined) {
    const nightRate = updates['riderProfile.nightRatePerKm'];
    if (nightRate === null || nightRate === undefined || isNaN(nightRate) || nightRate <= 0) {
      throw new ResponseError('Night rate must be a positive number greater than 0', 400);
    }
  }

  console.log('[riderController] Processing updates:', JSON.stringify(updates, null, 2));

  const rider = await User.findByIdAndUpdate(
    riderId,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  console.log('[riderController] MONGODB SAVE SUCCESS');
  console.log('[riderController] Saved riderProfile:', JSON.stringify(rider.riderProfile, null, 2));
  console.log('[riderController] Profile photo URL:', rider.riderProfile?.profilePhoto || 'NOT SET');
  console.log('[riderController] Profile photo publicId:', rider.riderProfile?.profilePhotoPublicId || 'NOT SET');

  res.status(200).json({
    success: true,
    message: 'Profile saved successfully.',
    data: rider,
  });
  console.log('[riderController] ========== PROFILE UPDATE REQUEST COMPLETE ==========');
});

/**
 * Get rider earnings
 */
export const getRiderEarnings = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { period = 30 } = req.query; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Get rides in the period
  const rides = await RideRequest.find({
    rider: riderId,
    status: 'completed',
    completedAt: { $gte: startDate },
  });

  const totalEarnings = rides.reduce((sum, ride) => {
    return sum + (ride.fare?.totalFare || 0);
  }, 0);

  const totalRides = rides.length;

  // Get wallet info
  const wallet = await Wallet.findOne({ user: riderId });

  // Calculate average per ride
  const averagePerRide = totalRides > 0 ? totalEarnings / totalRides : 0;

  // Get daily earnings breakdown
  const dailyEarnings = [];
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayTotal = rides
      .filter(r => {
        const rideDate = new Date(r.completedAt || r.createdAt);
        return rideDate >= dayStart && rideDate <= dayEnd;
      })
      .reduce((sum, r) => sum + (r.fare?.totalFare || 0), 0);

    dailyEarnings.push({
      date: dayStart.toISOString().split('T')[0],
      earnings: dayTotal,
      trips: rides.filter(r => {
        const rideDate = new Date(r.completedAt || r.createdAt);
        return rideDate >= dayStart && rideDate <= dayEnd;
      }).length,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      totalEarnings,
      totalRides,
      averagePerRide: parseFloat(averagePerRide.toFixed(2)),
      availableBalance: wallet?.balance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      totalWithdrawn: wallet?.totalWithdrawn || 0,
      period,
      dailyEarnings,
    },
  });
});

/**
 * Get rider location
 */
export const getRiderLocation = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  const rider = await User.findById(riderId).select('riderProfile.currentLocation riderProfile.lastLocationUpdate');

  if (!rider || !rider.riderProfile?.currentLocation) {
    throw new ResponseError('Location not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      location: rider.riderProfile.currentLocation,
      lastUpdated: rider.riderProfile.lastLocationUpdate || rider.updatedAt,
    },
  });
});

/**
 * Update rider online status
 */
export const updateOnlineStatus = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { isOnline, status } = req.body;

  const updates = {};
  
  if (typeof isOnline === 'boolean') {
    updates['riderProfile.isOnline'] = isOnline;
  }
  
  if (status && ['offline', 'online', 'busy', 'on_trip'].includes(status)) {
    updates['riderProfile.status'] = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new ResponseError('No valid status update provided', 400);
  }

  const rider = await User.findByIdAndUpdate(
    riderId,
    updates,
    { new: true }
  ).select('-password');

  // Emit socket event for real-time rider availability updates
  const io = req.app.get('io');
  if (io) {
    io.emit('rider_availability_changed', {
      riderId,
      isOnline: rider.riderProfile?.isOnline,
      status: rider.riderProfile?.status,
      location: rider.riderProfile?.currentLocation,
    });
    console.log('[updateOnlineStatus] Emitted rider_availability_changed event:', {
      riderId,
      isOnline: rider.riderProfile?.isOnline,
      status: rider.riderProfile?.status,
    });
  }

  res.status(200).json({
    success: true,
    message: `Rider status updated to ${updates['riderProfile.status'] || (isOnline ? 'online' : 'offline')}`,
    data: rider,
  });
});

/**
 * Update rider location (for live GPS tracking)
 */
export const updateRiderGPSLocation = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { latitude, longitude } = req.body;

  console.log(`[updateRiderGPSLocation] riderId=${riderId}, lat=${latitude}, lng=${longitude}`);

  if (latitude === undefined || longitude === undefined) {
    throw new ResponseError('Latitude and longitude are required', 400);
  }

  // Validate coordinates are valid numbers
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng)) {
    throw new ResponseError('Invalid coordinates', 400);
  }
  
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ResponseError('Coordinates out of range', 400);
  }

  const rider = await User.findByIdAndUpdate(
    riderId,
    {
      'riderProfile.currentLocation': {
        type: 'Point',
        coordinates: [lng, lat],
      },
      'riderProfile.lastLocationUpdate': new Date(),
    },
    { new: true }
  ).select('-password');

  console.log(`[updateRiderGPSLocation] Updated rider location:`, rider.riderProfile?.currentLocation);

  // Emit Socket.io event for real-time updates
  const io = req.app.get('io');
  if (io) {
    io.emit('rider_location_update', {
      riderId,
      location: {
        latitude: lat,
        longitude: lng,
      },
      timestamp: new Date(),
    });
  }

  res.status(200).json({
    success: true,
    message: 'Location updated successfully',
    data: {
      location: rider.riderProfile.currentLocation,
      lastUpdated: rider.riderProfile.lastLocationUpdate,
    },
  });
});

/**
 * Get nearby riders (for customer ride requests)
 * Returns riders who satisfy ALL of the following:
 * - Rider account is active
 * - Rider is online
 * - Rider has enabled location sharing (has currentLocation)
 * - Rider is not currently on another ride (status not 'on_trip' or 'busy')
 * - Rider is available to receive new ride requests
 * - Rider is within the configured radius of the customer
 */
export const getNearbyRiders = asyncHandler(async (req, res) => {
  console.log('getNearbyRiders endpoint reached');
  
  const { latitude, longitude, maxDistance = 1000000 } = req.query; // default to a very generous search radius in meters (1000 km) if not specified

  console.log(`[getNearbyRiders] Backend received request:`, {
    latitude,
    longitude,
    maxDistance,
    userId: req.user?._id,
    userRole: req.user?.role,
  });

  if (!latitude || !longitude) {
    console.error('[getNearbyRiders] Missing latitude or longitude');
    throw new ResponseError('Latitude and longitude are required', 400);
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  console.log(`[getNearbyRiders] Customer Latitude: ${lat} (isNumeric: ${!isNaN(lat)}), Longitude: ${lng} (isNumeric: ${!isNaN(lng)})`);

  if (isNaN(lat) || isNaN(lng)) {
    throw new ResponseError('Invalid coordinates provided', 400);
  }

  // STEP 3 — VERIFY & REPAIR MONGODB
  console.log('[MONGODB-VERIFY] Running index check...');
  try {
    const indexes = await User.collection.indexes();
    const has2dSphere = indexes.some(idx => Object.values(idx.key).includes('2dsphere'));
    console.log('[MONGODB-INDEX] Has 2dsphere index on currentLocation:', has2dSphere);
    if (!has2dSphere) {
      console.log('[MONGODB-INDEX] Recreating 2dsphere index on User...');
      await User.collection.createIndex({ 'riderProfile.currentLocation': '2dsphere' });
    }
  } catch (indexErr) {
    console.error('[MONGODB-INDEX] Error with 2dsphere index:', indexErr);
  }

  // Get ALL users with role "rider" from database
  // Bypassing any MongoDB query level blockades (such as strict isActive, isDeleted, isOnline) so we can do accurate diagnostics in memory
  const allRiderProfiles = await User.find({ role: 'rider' });
  const totalRidersInMongo = allRiderProfiles.length;
  console.log(`[MONGODB-VERIFY] Found ${totalRidersInMongo} total rider profiles in database`);

  // Helper functions for matching working hours and working areas
  const getClosestWorkingArea = (latVal, lngVal) => {
    const areas = [
      { name: 'Chebaiywa (Cheba)', lat: 0.2800, lng: 35.3000 },
      { name: 'Stage', lat: 0.2850, lng: 35.2900 },
      { name: 'Kesses', lat: 0.2900, lng: 35.3100 },
      { name: 'Mabs', lat: 0.2750, lng: 35.2850 },
    ];
    let closestArea = areas[0];
    let minDistance = Infinity;
    for (const area of areas) {
      // Haversine calculation to get distance in km to campus working area
      const riderLng = area.lng;
      const riderLat = area.lat;
      const R = 6371; // Earth's radius in km
      const dLat = (latVal - riderLat) * Math.PI / 180;
      const dLng = (lngVal - riderLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(riderLat * Math.PI / 180) * Math.cos(latVal * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance < minDistance) {
        minDistance = distance;
        closestArea = area;
      }
    }
    return { closestArea: closestArea.name, distanceToArea: minDistance };
  };

  const isTimeWithinHours = (current, start, end) => {
    if (!start || !end) return true;
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      return current >= start || current <= end;
    }
  };

  const getKenyanTimeStr = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
      const minutePart = parts.find(p => p.type === 'minute')?.value || '00';
      return `${hourPart}:${minutePart}`;
    } catch (e) {
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const nd = new Date(utc + (3600000 * 3));
      const hh = String(nd.getHours()).padStart(2, '0');
      const mm = String(nd.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  };

  const currentTimeStr = getKenyanTimeStr();
  const { closestArea, distanceToArea } = getClosestWorkingArea(lat, lng);

  console.log(`[getNearbyRiders] Current Kenyan time: ${currentTimeStr}, Closest campus working area: ${closestArea} (${distanceToArea.toFixed(2)} km away)`);

  let validCoordsCount = 0;
  let onlineCount = 0;
  let removedMissingCoordinates = 0;
  let removedInactiveAccounts = 0;
  let removedDistanceCalculation = 0;
  let removedServiceRadius = 0;
  let removedWorkingHours = 0;
  let removedWorkingArea = 0;

  const availableRidersWithDistance = [];
  const debugLogs = [];

  debugLogs.push(`Customer coordinates:\nLat: ${lat}, Lng: ${lng}\n`);
  debugLogs.push(`Searching within:\n${(parseFloat(maxDistance) / 1000).toFixed(1)} km\n`);

  // We will process all existing riders to log accurate exclusion/inclusion reasons
  for (const rider of allRiderProfiles) {
    const riderName = rider.name || 'Unnamed Rider';
    const profile = rider.riderProfile || {};
    const riderLoc = profile.currentLocation;

    const riderExclusions = [];
    const logChecklist = [];

    logChecklist.push(`Rider: ${riderName} (ID: ${rider._id})`);

    // 1. Role Check
    logChecklist.push(`  ✓ role check (role: "${rider.role}")`);

    // 2. Online Check (Confirm that isOnline === true is parsed)
    if (profile.isOnline) {
      logChecklist.push(`  ✓ online check (isOnline: true)`);
      onlineCount++;
    } else {
      logChecklist.push(`  ✗ online check (isOnline: false)`);
      riderExclusions.push('Offline');
    }

    // 3. Coordinate Check
    if (!riderLoc || !Array.isArray(riderLoc.coordinates) || riderLoc.coordinates.length < 2) {
      logChecklist.push(`  ✗ coordinates valid (missing coordinates array)`);
      riderExclusions.push('Missing coordinates');
      removedMissingCoordinates++;
      debugLogs.push(logChecklist.join('\n') + `\n  ✗ EXCLUDED because of: Missing coordinates\n`);
      continue;
    }

    let rLng = riderLoc.coordinates[0];
    let rLat = riderLoc.coordinates[1];

    if (rLng === null || rLat === null || isNaN(rLng) || isNaN(rLat)) {
      logChecklist.push(`  ✗ coordinates valid (null or NaN coordinates: [${rLng}, ${rLat}])`);
      riderExclusions.push('Missing coordinates');
      removedMissingCoordinates++;
      debugLogs.push(logChecklist.join('\n') + `\n  ✗ EXCLUDED because of: Missing coordinates\n`);
      continue;
    }

    // Automatically repair swapped coordinates: [latitude, longitude] to [longitude, latitude]
    // In Kenya, latitude is between -10 and 10, longitude is between 30 and 45.
    if (rLng >= -10 && rLng <= 10 && rLat >= 30 && rLat <= 45) {
      console.log(`[MONGODB-REPAIR] Swapping coordinates for rider ${riderName}: [${rLng}, ${rLat}] -> [${rLat}, ${rLng}]`);
      const tempLng = rLng;
      rLng = rLat;
      rLat = tempLng;

      // Repair in memory
      rider.riderProfile.currentLocation.coordinates = [rLng, rLat];
    }

    logChecklist.push(`  ✓ coordinates valid (coordinates: [${rLng}, ${rLat}])`);
    validCoordsCount++;

    // 4. Inactive Check (Explicitly checks if rider is suspended or deleted)
    // Relaxed deleted/active flags - bypass if not explicitly deactivated/deleted
    const isInactive = rider.isActive === false || rider.isDeleted === true;
    if (isInactive) {
      logChecklist.push(`  ✗ active check (isActive: ${rider.isActive}, isDeleted: ${rider.isDeleted})`);
      riderExclusions.push('Inactive account');
      removedInactiveAccounts++;
    } else {
      logChecklist.push(`  ✓ active check (isActive: ${rider.isActive}, isDeleted: ${rider.isDeleted})`);
    }

    // 5. Working Hours Check
    let hoursOk = true;
    if (profile.workingHours && profile.workingHours.start && profile.workingHours.end) {
      const { start, end } = profile.workingHours;
      hoursOk = isTimeWithinHours(currentTimeStr, start, end);
      if (!hoursOk) {
        logChecklist.push(`  ✗ working hours check (outside working hours: ${start} - ${end}, current: ${currentTimeStr})`);
        riderExclusions.push('Outside working hours');
        removedWorkingHours++;
      } else {
        logChecklist.push(`  ✓ working hours check (within working hours: ${start} - ${end})`);
      }
    } else {
      logChecklist.push(`  ✓ working hours check (working hours not set)`);
    }

    // 6. Working Area Check
    let areaOk = true;
    if (distanceToArea <= 25) {
      if (profile.workingArea && Array.isArray(profile.workingArea.selectedWorkingAreas) && profile.workingArea.selectedWorkingAreas.length > 0) {
        areaOk = profile.workingArea.selectedWorkingAreas.includes(closestArea);
        if (!areaOk) {
          logChecklist.push(`  ✗ working area check (outside selected working areas, closest: ${closestArea})`);
          riderExclusions.push('Outside working area');
          removedWorkingArea++;
        } else {
          logChecklist.push(`  ✓ working area check (within working area: ${closestArea})`);
        }
      } else {
        logChecklist.push(`  ✓ working area check (no working areas configured)`);
      }
    } else {
      logChecklist.push(`  ✓ working area check (not near campus areas, distanceToArea: ${distanceToArea.toFixed(2)} km)`);
    }

    // 7. Distance & Service Radius Check
    // Haversine distance in km from customer to rider
    const R = 6371; // Earth's radius in km
    const dLat = (lat - rLat) * Math.PI / 180;
    const dLng = (lng - rLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(rLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (isNaN(distance)) {
      logChecklist.push(`  ✗ distance calculation (NaN distance calculated)`);
      riderExclusions.push('Distance calculation error');
      removedDistanceCalculation++;
    } else {
      // Check max distance constraint (default: very generous, e.g. 1000 km)
      const maxSearchRadiusKm = parseFloat(maxDistance) / 1000;
      if (distance <= maxSearchRadiusKm) {
        logChecklist.push(`  ✓ distance check (distance: ${distance.toFixed(2)} km <= search radius: ${maxSearchRadiusKm.toFixed(2)} km)`);
      } else {
        logChecklist.push(`  ✗ distance check (distance: ${distance.toFixed(2)} km > search radius: ${maxSearchRadiusKm.toFixed(2)} km)`);
        riderExclusions.push('Outside search radius');
        removedDistanceCalculation++;
      }

      // Check rider service radius constraint (default to a very generous 25 km if not set)
      let radiusKm = 25;
      if (profile.workingArea && profile.workingArea.serviceRadius) {
        const parsedRadius = parseFloat(profile.workingArea.serviceRadius.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedRadius) && parsedRadius > 0) {
          radiusKm = parsedRadius;
        }
      }

      if (distance <= radiusKm) {
        logChecklist.push(`  ✓ service radius check (distance: ${distance.toFixed(2)} km <= service radius: ${radiusKm.toFixed(2)} km)`);
      } else {
        logChecklist.push(`  ✗ service radius check (distance: ${distance.toFixed(2)} km > service radius: ${radiusKm.toFixed(2)} km)`);
        riderExclusions.push('Outside service radius');
        removedServiceRadius++;
      }
    }

    if (riderExclusions.length === 0) {
      logChecklist.push(`  ✓ PASSED ALL FILTERS`);
      availableRidersWithDistance.push({
        _id: rider._id,
        id: rider._id,
        riderName: rider.name,
        name: rider.name,
        profilePhoto: profile.profilePhoto || rider.avatar || '',
        avatar: profile.profilePhoto || rider.avatar || '',
        rating: parseFloat(profile.rating || 5.0),
        totalTrips: parseInt(profile.totalRides || 0),
        motorcycleType: profile.motorcycle?.brand || profile.vehicleType || 'Yamaha',
        vehicleType: profile.motorcycle?.brand || profile.vehicleType || 'Yamaha',
        motorcycle: profile.motorcycle,
        latitude: rLat,
        longitude: rLng,
        distance: parseFloat(distance.toFixed(2)),
        estimatedArrival: Math.max(1, Math.round(distance * 3)), // 3 min per km
        isOnline: profile.isOnline || false,
      });
      debugLogs.push(logChecklist.join('\n') + '\n');
    } else {
      logChecklist.push(`  ✗ EXCLUDED because of: ${riderExclusions.join(', ')}`);
      debugLogs.push(logChecklist.join('\n') + '\n');
    }
  }

  // Sort by distance
  availableRidersWithDistance.sort((a, b) => a.distance - b.distance);

  // Log the complete rider search audit report
  console.log('================ RIDER SEARCH FLOW AUDIT ================');
  console.log(`- total rider profiles in MongoDB: ${totalRidersInMongo}`);
  console.log(`- riders with role "rider": ${totalRidersInMongo}`);
  console.log(`- riders with "isOnline=true": ${onlineCount}`);
  console.log(`- riders with valid coordinates: ${validCoordsCount}`);
  console.log(`- riders removed because of missing coordinates: ${removedMissingCoordinates}`);
  console.log(`- riders removed because of inactive accounts: ${removedInactiveAccounts}`);
  console.log(`- riders removed because of distance calculation: ${removedDistanceCalculation}`);
  console.log(`- riders removed because of service radius: ${removedServiceRadius}`);
  if (removedWorkingHours > 0) console.log(`- riders removed because of working hours: ${removedWorkingHours}`);
  if (removedWorkingArea > 0) console.log(`- riders removed because of working area: ${removedWorkingArea}`);
  console.log(`- final rider array before returning:`, availableRidersWithDistance.map(r => r.riderName));
  console.log('\n--- DETAILED CHECKLISTS ---');
  console.log(debugLogs.join('\n'));
  console.log('=========================================================');

  res.status(200).json({
    success: true,
    data: availableRidersWithDistance,
    count: availableRidersWithDistance.length,
  });
});

/**
 * Get rider's active ride
 */
export const getActiveRide = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  const activeRide = await RideRequest.findOne({
    rider: riderId,
    status: { $in: ['accepted', 'in_progress', 'awaiting_customer_confirmation'] },
  })
    .populate('customer', 'name phone avatar')
    .sort('-createdAt');

  if (!activeRide) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  res.status(200).json({
    success: true,
    data: activeRide,
  });
});

/**
 * Get rider notifications (ride-related)
 */
export const getRiderNotifications = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { unreadOnly = false } = req.query;

  // Get notifications from the Notification model
  const Notification = (await import('../models/Notification.js')).default;
  
  let query = {
    user: riderId,
    type: { $in: ['ride_request', 'ride_accepted', 'ride_completed', 'payment_released'] },
  };

  if (unreadOnly === 'true') {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .populate('relatedRide', 'pickupLocation dropoffLocation status fare')
    .sort('-createdAt')
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    user: riderId,
    read: false,
    type: { $in: ['ride_request', 'ride_accepted', 'ride_completed', 'payment_released'] },
  });

  res.status(200).json({
    success: true,
    data: notifications,
    unreadCount,
  });
});

/**
 * Remove rider profile photo
 */
export const removeProfilePhoto = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const rider = await User.findById(riderId);
  if (!rider) {
    throw new ResponseError('Rider not found', 404);
  }

  // Delete from Cloudinary if publicId exists
  if (rider.riderProfile?.profilePhotoPublicId) {
    try {
      await cloudinary.uploader.destroy(rider.riderProfile.profilePhotoPublicId);
      console.log('[riderController] Deleted profile photo from Cloudinary:', rider.riderProfile.profilePhotoPublicId);
    } catch (error) {
      console.error('[riderController] Failed to delete profile photo from Cloudinary:', error);
    }
  }

  // Clear photo fields
  rider.riderProfile.profilePhoto = '';
  rider.riderProfile.profilePhotoPublicId = '';
  await rider.save();

  res.status(200).json({
    success: true,
    message: 'Profile photo removed successfully',
    data: rider,
  });
});

/**
 * Remove motorcycle photo
 */
export const removeMotorcyclePhoto = asyncHandler(async (req, res) => {
  const riderId = req.user._id;

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const rider = await User.findById(riderId);
  if (!rider) {
    throw new ResponseError('Rider not found', 404);
  }

  // Delete from Cloudinary if publicId exists
  if (rider.riderProfile?.motorcycle?.photoPublicId) {
    try {
      await cloudinary.uploader.destroy(rider.riderProfile.motorcycle.photoPublicId);
      console.log('[riderController] Deleted motorcycle photo from Cloudinary:', rider.riderProfile.motorcycle.photoPublicId);
    } catch (error) {
      console.error('[riderController] Failed to delete motorcycle photo from Cloudinary:', error);
    }
  }

  // Clear photo fields
  if (rider.riderProfile.motorcycle) {
    rider.riderProfile.motorcycle.photo = '';
    rider.riderProfile.motorcycle.photoPublicId = '';
  }
  await rider.save();

  res.status(200).json({
    success: true,
    message: 'Motorcycle photo removed successfully',
    data: rider,
  });
});