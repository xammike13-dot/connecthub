import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'order',
        'order_update',
        'payment',
        'ride_request',
        'ride_accepted',
        'ride_completed',
        'booking',
        'booking_confirmed',
        'message',
        'system',
        'new_order',
        'order_payment_confirmed',
        'order_delivered',
        'delivery_confirmed',
        'payment_received',
        'rental_booking',
        'ride_payment_confirmed',
        'ride_payment_failed',
        'booking_request',
        'order_accepted',
        'new_booking',
        'rent_due',
        'rent_payment_received',
        'rent_payment_confirmed',
        'order_payment_failed',
        'rental_payment_failed',
        'payment_released',
        'ride_awaiting_customer_confirmation',
        'ride_in_progress',
        'ride_started',
        'ride_declined',
        'ride_cancelled',
        'ride_pending_payment',
        'ride_waiting_rider',
        'ride_no_rider_available',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
      type: String,
      default: null,
    },
    navigationTarget: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
// Compound index to prevent duplicate notifications for same user, type, and data
NotificationSchema.index({ user: 1, type: 1, 'data.rideId': 1 }, { unique: true, sparse: true });
NotificationSchema.index({ user: 1, type: 1, 'data.orderId': 1 }, { unique: true, sparse: true });
NotificationSchema.index({ user: 1, type: 1, 'data.bookingId': 1 }, { unique: true, sparse: true });

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;