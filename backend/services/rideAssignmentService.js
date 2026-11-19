import mongoose from 'mongoose';
import User from '../models/User.js';
import RideRequest from '../models/RideRequest.js';
import { normalizeArea } from '../utils/rideFareCalculator.js';

const ACTIVE_RIDE_STATUSES = ['accepted', 'in_progress', 'awaiting_customer_confirmation'];

export const isRiderAvailableForPickup = async (riderId, pickup) => {
  if (!mongoose.Types.ObjectId.isValid(riderId)) return false;
  const rider = await User.findById(riderId);
  if (
    !rider ||
    rider.role !== 'rider' ||
    rider.isActive === false ||
    rider.isDeleted === true
  ) {
    return false;
  }

  const profile = rider.riderProfile || {};
  const isOnline =
    (profile.isOnline === true || profile.status === 'online' || profile.isAvailable === true) &&
    profile.status !== 'busy' &&
    profile.status !== 'on_trip' &&
    (profile.status !== 'offline' || profile.isOnline === true || profile.isAvailable === true);
  if (!isOnline) return false;

  const pickupArea = normalizeArea(pickup);
  const workingAreas = profile.workingArea?.selectedWorkingAreas || [];
  if (
    pickupArea &&
    workingAreas.length > 0 &&
    !workingAreas.some((area) => normalizeArea(area) === pickupArea)
  ) {
    return false;
  }

  const activeRide = await RideRequest.exists({
    rider: rider._id,
    status: { $in: ACTIVE_RIDE_STATUSES },
  });
  return !activeRide;
};

export const getRideRequestTimeoutDate = () => {
  const configuredTimeout = Number(process.env.RIDE_REQUEST_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 120000;
  return new Date(Date.now() + timeoutMs);
};

export const emitRideRequestToRider = (io, ride, customer) => {
  if (!io || !ride.rider) return;

  io.to(`rider_${ride.rider}`).emit('ride_request', {
    rideId: ride._id,
    passenger: {
      id: customer?._id,
      name: customer?.name || 'Passenger',
      photo: customer?.avatar || customer?.profilePhoto || '',
    },
    pickupLocation: ride.pickupLocation,
    pickupCoordinates: ride.pickupLocation?.coordinates || [],
    dropoffLocation: ride.dropoffLocation,
    dropoffCoordinates: ride.dropoffLocation?.coordinates || [],
    fare: ride.fare,
    paymentStatus: ride.paymentStatus,
    status: ride.status,
    responseExpiresAt: ride.responseExpiresAt,
  });
};
