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
      ],
    },

    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
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
          enum: ['pending', 'confirmed', 'out_for_handover', 'active', 'completed', 'cancelled'],
          default: 'pending',
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
          enum: ['held', 'released'],
          default: 'held',
        },
        fundsReleased: {
          type: Boolean,
          default: false,
        },
        fundsReleasedAt: {
          type: Date,
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

export default mongoose.model('Rental', rentalSchema);