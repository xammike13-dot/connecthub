import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    role: {
      type: String,
      enum: ['customer', 'landlord', 'business', 'rider', 'admin'],
      default: 'customer',
      index: true,
    },
    deviceType: {
      type: String,
      default: 'desktop',
    },
    browser: {
      type: String,
      default: 'unknown',
    },
    endpoint: {
      type: String,
      required: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    subscription: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    notificationPermission: {
      type: String,
      enum: ['granted', 'denied', 'default'],
      default: 'granted',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique indexes on endpoint to avoid duplicate registrations
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ 'subscription.endpoint': 1 }, { unique: true });

const PushSubscription = mongoose.model('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
