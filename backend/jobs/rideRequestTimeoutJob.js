import RideRequest from '../models/RideRequest.js';
import { createNotification } from '../controllers/notificationController.js';
import { getIO } from '../utils/socket.js';

let timeoutJob;

const expireRideRequests = async () => {
  const now = new Date();
  const expiredRequests = await RideRequest.find({
    status: 'waiting_rider',
    responseExpiresAt: { $lte: now },
  }).select('_id customer rider');

  for (const request of expiredRequests) {
    try {
      const expiredRide = await RideRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: 'waiting_rider',
          responseExpiresAt: { $lte: now },
        },
        { $set: { status: 'no_rider_available' }, $unset: { responseExpiresAt: 1 } },
        { new: true }
      );
      if (!expiredRide) continue;

      const payload = {
        rideId: expiredRide._id,
        riderId: request.rider,
        status: expiredRide.status,
        message: 'Your selected rider did not respond in time. Choose another available rider; your payment is already confirmed.',
      };
      getIO()?.to(`user_${request.customer}`).emit('ride_request_expired', payload);
      await createNotification(
        request.customer,
        'ride_no_rider_available',
        'Rider Did Not Respond',
        payload.message,
        { rideId: expiredRide._id },
        `/customer/rides/${expiredRide._id}`,
        '/customer/rides'
      );
    } catch (error) {
      console.error(`[Ride request timeout] Could not expire ride ${request._id}:`, error);
    }
  }
};

export const startRideRequestTimeoutJob = () => {
  if (timeoutJob) return timeoutJob;
  timeoutJob = setInterval(() => {
    expireRideRequests().catch((error) => {
      console.error('[Ride request timeout job failed]', error);
    });
  }, 15000);
  expireRideRequests().catch((error) => {
    console.error('[Ride request timeout job failed]', error);
  });
  return timeoutJob;
};
