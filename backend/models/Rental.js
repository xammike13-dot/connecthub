import mongoose from 'mongoose';
console.log('Loading models/Rental.js');

const rentalSchema = new mongoose.Schema(
  {
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    rentalName: {
      type: String,
      required: [true, 'Rental name is required'],
      trim: true,
      maxlength: 100,
    },

    rentalType: {
      type: String,
      required: true,
      enum: [
        'single',
        'bedsitter',
        'one-bedroom',
        'two-bedroom',
        'three-bedroom',
        'apartment',
        'hostel',
        'commercial',
      ],
    },

    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    rentalPeriod: {
      type: String,
      enum: ['month', 'night', 'semester', 'year', 'day'],
      default: 'month',
    },

    bedrooms: {
      type: Number,
      min: 0,
    },

    bathrooms: {
      type: Number,
      min: 0,
    },

    caretaker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    location: {
      type: String,
      required: true,
      enum: ['cheba', 'mabs', 'stage', 'kesses'],
    },

    amenities: [
      {
        type: String,
        enum: [
          'wifi',
          'security',
          'parking',
          'balcony',
        ],
      },
    ],

    description: {
      type: String,
      trim: true,
      default: '',
    },

    images: [
      {
        url: String,
        publicId: String,
      },
    ],

    bookings: [
      {
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        // Automatic booking start date - set on payment confirmation
        bookingStartDate: {
          type: Date,
        },
        // Monthly rent tracking
        lastRentPaymentDate: {
          type: Date,
        },
        nextRentDueDate: {
          type: Date,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: [
            'pending',
            'paid_in_escrow',
            'confirmed',
            'preparing_accommodation',
            'accommodation_ready',
            'customer_arrived',
            'out_for_handover',
            'move_in_confirmed',
            'active',
            'completed',
            'cancelled',
            'declined',
            'disputed',
          ],
          default: 'pending',
        },
        stage: {
          type: String,
          enum: [
            'booking_received',
            'booking_accepted',
            'preparing_accommodation',
            'accommodation_ready',
            'customer_arrived',
            'move_in_confirmed',
            'completed',
          ],
          default: 'booking_received',
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid', 'refunded'],
          default: 'pending',
        },
        paymentMethod: {
          type: String,
          enum: ['mpesa'],
          default: 'mpesa',
        },
        bookedAt: {
          type: Date,
          default: Date.now,
        },
        transaction: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Transaction',
        },
        // Move-in confirmation fields
        moveInConfirmedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        moveInConfirmedAt: Date,
        moveInConfirmed: {
          type: Boolean,
          default: false,
        },
        moveInDate: Date,
        // Payment release fields
        paymentReleasedAt: Date,

        // Customer soft delete/archive for individual bookings
        hiddenByCustomer: {
          type: Boolean,
          default: false,
        },
        archivedByCustomer: {
          type: Boolean,
          default: false,
        },
        // Decline reason
        declineReason: {
          type: String,
          default: '',
        },
        // Monthly rent reminder fields
        lastRentReminderSent: {
          type: Date,
        },
        // Escrow fields for payment holding
        escrowStatus: {
          type: String,
          enum: ['held', 'released', 'refunded', 'disputed'],
          default: 'held',
        },
        fundsReleased: {
          type: Boolean,
          default: false,
        },
        fundsReleasedAt: {
          type: Date,
        },
        // Dispute management
        dispute: {
          isDisputed: {
            type: Boolean,
            default: false,
            index: true,
          },
          reason: String,
          details: String,
          status: {
            type: String,
            enum: ['none', 'open', 'resolved_refunded', 'resolved_released', 'rejected'],
            default: 'none',
          },
          reportedAt: Date,
          reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          resolutionNote: String,
          resolvedAt: Date,
        },
        // Transaction communication thread reference
        conversation: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Conversation',
        },
      },
    ],

    isAvailable: {
      type: Boolean,
      default: true,
    },

    views: {
      type: Number,
      default: 0,
    },

    favoritesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

rentalSchema.pre('validate', function(next) {
  if (this.images && Array.isArray(this.images)) {
    this.images = this.images.map((img) => {
      if (typeof img === 'string') {
        return { url: img, publicId: null };
      }
      return img;
    });
  }
  next();
});

export default mongoose.model('Rental', rentalSchema);