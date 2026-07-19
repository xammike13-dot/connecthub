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
  
  const { latitude, longitude, maxDistance = 10000 } = req.query; // maxDistance in meters

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

  if (isNaN(lat) || isNaN(lng)) {
    throw new ResponseError('Invalid coordinates provided', 400);
  }

  // Find riders who satisfy ALL availability conditions
  console.log(`[getNearbyRiders] Querying MongoDB for riders near: [${lng}, ${lat}] within ${maxDistance}m`);
  
  const riders = await User.find({
    role: 'rider',
    isActive: true, // Account must be active
    isDeleted: false, // Account must not be deleted
    'riderProfile.isOnline': true, // Rider must be online
    'riderProfile.currentLocation': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: parseInt(maxDistance),
      },
    },
    // Rider must not be on another ride
    'riderProfile.status': {
      $in: ['online'], // Only riders with 'online' status (not 'busy' or 'on_trip')
    },
  }).select('name phone avatar riderProfile');

  console.log(`[getNearbyRiders] MongoDB returned ${riders.length} riders`);
  if (riders.length > 0) {
    console.log(`[getNearbyRiders] Sample rider locations:`, 
      riders.slice(0, 2).map(r => ({
        name: r.name,
        isOnline: r.riderProfile?.isOnline,
        status: r.riderProfile?.status,
        location: r.riderProfile?.currentLocation,
      }))
    );
  }

  // Additional check: verify riders are not currently on an active ride
  const riderIds = riders.map(r => r._id);
  const activeRideRiders = await RideRequest.find({
    rider: { $in: riderIds },
    status: { $in: ['accepted', 'in_progress', 'awaiting_customer_confirmation'] },
  }).distinct('rider');

  const activeRideRiderIds = activeRideRiders.map(id => id.toString());
  console.log(`[getNearbyRiders] Riders currently on active rides:`, activeRideRiderIds.length);

  // Filter out riders who are currently on rides
  const availableRiders = riders.filter(rider => 
    !activeRideRiderIds.includes(rider._id.toString())
  );

  console.log(`[getNearbyRiders] Available riders after filtering:`, availableRiders.length);

  // Helper functions for matching working hours and working areas
  const getClosestWorkingArea = (latVal, lngVal) => {
    const areas = [
      { name: 'Chebaiywa (Cheba)', lat: 0.2800, lng: 35.3000 },
      { name: 'Stage', lat: 0.2850, lng: 35.2900 },
      { name: 'Kesses', lat: 0.2900, lng: 35.3100 },
      { name: 'Mabs', lat: 0.2750, lng: 35.2850 },
    ];
    let closestArea = areas[0].name;
    let minDistance = Infinity;
    for (const area of areas) {
      const d = Math.sqrt(Math.pow(latVal - area.lat, 2) + Math.pow(lngVal - area.lng, 2));
      if (d < minDistance) {
        minDistance = d;
        closestArea = area.name;
      }
    }
    return closestArea;
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
  const closestArea = getClosestWorkingArea(lat, lng);

  console.log(`[getNearbyRiders] Current Kenyan time: ${currentTimeStr}, Closest area to request: ${closestArea}`);

  // Respect selected working areas and working hours
  const activeMatchingRiders = availableRiders.filter(rider => {
    const profile = rider.riderProfile || {};

    // Check working hours
    if (profile.workingHours && profile.workingHours.start && profile.workingHours.end) {
      const { start, end } = profile.workingHours;
      const isWithinTime = isTimeWithinHours(currentTimeStr, start, end);
      if (!isWithinTime) {
        console.log(`[getNearbyRiders] Filtering out rider ${rider.name} because current time ${currentTimeStr} is outside hours ${start}-${end}`);
        return false;
      }
    }

    // Check selected working areas
    if (profile.workingArea && Array.isArray(profile.workingArea.selectedWorkingAreas) && profile.workingArea.selectedWorkingAreas.length > 0) {
      const isAreaSupported = profile.workingArea.selectedWorkingAreas.includes(closestArea);
      if (!isAreaSupported) {
        console.log(`[getNearbyRiders] Filtering out rider ${rider.name} because closest area ${closestArea} is not in selected working areas ${JSON.stringify(profile.workingArea.selectedWorkingAreas)}`);
        return false;
      }
    }

    return true;
  });

  console.log(`[getNearbyRiders] Riders matching area/time constraints:`, activeMatchingRiders.length);

  // Calculate distance for each rider
  const ridersWithDistance = activeMatchingRiders.map(rider => {
    const riderLoc = rider.riderProfile?.currentLocation;
    if (!riderLoc || !Array.isArray(riderLoc.coordinates) || riderLoc.coordinates.length < 2) return null;

    // Simple distance calculation (Haversine formula approximation)
    const riderLng = riderLoc.coordinates[0];
    const riderLat = riderLoc.coordinates[1];
    const customerLng = lng;
    const customerLat = lat;

    const R = 6371; // Earth's radius in km
    const dLat = (customerLat - riderLat) * Math.PI / 180;
    const dLng = (customerLng - riderLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(riderLat * Math.PI / 180) * Math.cos(customerLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return {
      id: rider._id,
      name: rider.name,
      // Phone is NOT included for security - only revealed after rider accepts
      avatar: rider.avatar || rider.riderProfile?.profilePhoto,
      rating: rider.riderProfile?.rating || 0,
      vehicleType: rider.riderProfile?.motorcycle?.brand || rider.riderProfile?.vehicleType || 'Bodaboda',
      motorcycle: rider.riderProfile?.motorcycle,
      distance: parseFloat(distance.toFixed(2)),
      isOnline: rider.riderProfile?.isOnline,
    };
  }).filter(r => r !== null).sort((a, b) => a.distance - b.distance);

  res.status(200).json({
    success: true,
    data: ridersWithDistance,
    count: ridersWithDistance.length,
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