import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'order',
        'order_update',
        'order_accepted',
        'order_delivered',
        'new_order',
        'order_payment_confirmed',
        'delivery_confirmed',
        'payment',
        'payment_received',
        'ride_request',
        'ride_accepted',
        'ride_completed',
        'booking',
        'booking_confirmed',
        'booking_request',
        'rental_booking',
        'message',
        'system',
        'ride_payment_confirmed',
        'ride_payment_failed',
        'booking_cancelled',
        'move_in_date_set',
        'move_in_confirmed',
        'move_in_confirmed_success',
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
    notificationType: {
      type: String,
      enum: ['order', 'rental', 'ride', 'healthcare', 'payment', 'system', 'general'],
      default: 'general',
      index: true,
    },
    relatedEntityId: {
      type: String,
      default: null,
      index: true,
    },
    relatedEntityType: {
      type: String,
      enum: ['Order', 'Rental', 'RideRequest', 'Transaction', 'Healthcare', null],
      default: null,
    },
    actionRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'archived'],
      default: 'unread',
      index: true,
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

// Pre-save hook to keep status/read and user/userId synchronized
NotificationSchema.pre('save', function (next) {
  if (this.read) {
    this.status = 'read';
  } else if (this.status === 'read') {
    this.read = true;
  } else if (this.status === 'archived') {
    this.read = true; // Archived is read too
  } else {
    this.read = false;
    this.status = 'unread';
  }

  if (this.user && !this.userId) {
    this.userId = this.user;
  } else if (this.userId && !this.user) {
    this.user = this.userId;
  }
  next();
});

// Index for efficient querying
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Compound index to prevent duplicate notifications for same user, type, and data
NotificationSchema.index({ user: 1, type: 1, 'data.rideId': 1 }, { sparse: true });
NotificationSchema.index({ user: 1, type: 1, 'data.orderId': 1 }, { sparse: true });
NotificationSchema.index({ user: 1, type: 1, 'data.bookingId': 1 }, { sparse: true });

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;