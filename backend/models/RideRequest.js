import mongoose from 'mongoose';

const rideRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pickupLocation: {
      name: String,
      address: {
        type: String,
        required: false,
      },
      landmark: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
      }
    },
    dropoffLocation: {
      name: String,
      address: {
        type: String,
        required: false,
      },
      landmark: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
      }
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    status: {
      type: String,
      enum: ['pending_payment', 'waiting_rider', 'accepted', 'in_progress', 'awaiting_customer_confirmation', 'completed', 'declined', 'cancelled', 'no_rider_available'],
      default: 'pending_payment',
    },
    rideType: {
      type: String,
      enum: ['standard', 'express', 'delivery', 'bodaboda'],
      default: 'bodaboda',
    },
    estimatedPrice: {
      type: Number,
    },
    passengers: {
      type: Number,
      default: 1,
    },
    specialRequests: String,
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    estimatedDistance: {
      type: Number, // in km
    },
    estimatedDuration: {
      type: Number, // in minutes
    },
    fare: {
      baseFare: {
        type: Number,
        required: true,
      },
      distanceFare: Number,
      timeFare: Number,
      serviceFee: Number,
      totalFare: {
        type: Number,
        required: true,
      },
      // Platform fee breakdown
      platformFee: {
        type: Number,
        required: true,
        default: 0,
      },
      customerShare: {
        type: Number,
        required: true,
        default: 0,
      },
      riderShare: {
        type: Number,
        required: true,
        default: 0,
      },
      riderReceives: {
        type: Number,
        required: true,
        default: 0,
      },
      // Metadata
      ratePerKm: Number,
      distanceInKm: Number,
      appliedRule: String,
      // Rider rate tracking (for audit purposes)
      riderId: mongoose.Schema.Types.ObjectId,
      riderDayRate: Number,
      riderNightRate: Number,
    },
    paymentMethod: {
      type: String,
      enum: ['mpesa', 'cash', 'card'],
      default: 'mpesa',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: String,
    mpesaReceiptNumber: String,
    acceptedAt: Date,
    startedAt: Date,
    notes: String,
    riderNotes: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: String,
    completedAt: Date,
    cancelledAt: Date,
    // Customer confirmation fields for ride completion
    rideConfirmedByCustomer: {
      type: Boolean,
      default: false,
    },
    customerConfirmedAt: Date,
    paymentReleasedAt: Date,
    // Escrow system for payment holding
    escrowStatus: {
      type: String,
      enum: ['none', 'held', 'released', 'refunded'],
      default: 'none',
    },
    fundsReleased: {
      type: Boolean,
      default: false,
    },
    fundsReleasedAt: Date,
    customerConfirmedArrival: {
      type: Boolean,
      default: false,
    },
    rating: {
      customerRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      riderRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      customerFeedback: String,
      riderFeedback: String,
    },
    trackingHistory: [{
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
        },
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      status: String,
    }],

    // Customer soft delete/archive
    hiddenByCustomer: {
      type: Boolean,
      default: false,
    },
    archivedByCustomer: {
      type: Boolean,
      default: false,
    },
    // Proper soft delete fields
    isDeletedByCustomer: {
      type: Boolean,
      default: false,
    },
    isDeletedByRider: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
rideRequestSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
rideRequestSchema.index({ 'dropoffLocation.coordinates': '2dsphere' });
rideRequestSchema.index({ 'currentLocation.coordinates': '2dsphere' });
rideRequestSchema.index({ customer: 1, status: 1 });
rideRequestSchema.index({ rider: 1, status: 1 });
rideRequestSchema.index({ createdAt: -1 });
// Unique index on transaction to prevent duplicate rides for same payment
rideRequestSchema.index({ transaction: 1 }, { unique: true, sparse: true });

const RideRequest = mongoose.model('RideRequest', rideRequestSchema);

export default RideRequest;