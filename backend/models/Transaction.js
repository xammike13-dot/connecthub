import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionRef: {
      type: String,
      unique: true,
      required: true,
    },
    mpesaReceiptNumber: {
      type: String,
    },
    checkoutRequestID: {
      type: String,
    },
    merchantRequestID: {
      type: String,
    },
    transactionDate: {
      type: String,
    },
    paidPhoneNumber: {
      type: String,
    },
    paidAmount: {
      type: Number,
    },
    type: {
      type: String,
      enum: ['order', 'rental', 'healthcare', 'ride'],
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Made optional - no rider assigned until payment succeeds
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },

    paymentMethod: {
      type: String,
      enum: ['mpesa'],
      default: 'mpesa',
    },
    amount: {
      baseAmount: {
        type: Number,
        required: true,
      },
      deliveryFee: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
    },
    commission: {
      totalCommission: {
        type: Number,
        required: true,
      },
      customerShare: {
        type: Number,
        required: true,
      },
      providerShare: {
        type: Number,
        required: true,
      },
      providerReceives: {
        type: Number,
        required: true,
      },
    },
    customerPaid: {
      type: Number,
      required: true,
    },
    providerReceives: {
      type: Number,
      required: true,
    },
    relatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Made optional - set after payment succeeds
    },
    // Store ride data temporarily before RideRequest is created (payment-first workflow)
    pendingRideData: {
      pickupLocation: Object,
      dropoffLocation: Object,
      estimatedDistance: Number,
      rideType: {
        type: String,
        default: 'bodaboda',
      },
      selectedRiderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      fareBreakdown: Object,
    },
    // Store entity data temporarily before Order/Rental is created (payment-first workflow)
    pendingEntityData: {
      entityId: mongoose.Schema.Types.ObjectId,
      entityType: String,
      items: [{
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        quantity: Number,
        price: Number,
        name: String
      }],
      deliveryAddress: {
        phone: String,
        address: String,
        neighborhood: String,
        landmark: String
      },
      deliveryFee: Number,
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      paymentBreakdown: Object,
    },
    relatedEntityType: {
      type: String,
      enum: ['Order', 'Rental', 'RideRequest', 'order', 'rental', 'ride', 'rideRequest'],
      required: true,
    },
    darajaResponse: {
      type: Object,
    },
    darajaCallbackData: {
      type: Object,
    },
    webhookData: {
      type: Object,
    },
    errorMessage: {
      type: String,
    },
    paidAt: Date,
    completedAt: Date,
    refundedAt: Date,
    refundReason: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
transactionSchema.index({ customer: 1, status: 1 });
transactionSchema.index({ provider: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ mpesaReceiptNumber: 1 });
transactionSchema.index({ checkoutRequestID: 1 });
// Non-unique index on relatedEntity to support multiple transactions referencing different or same optional entities (e.g., monthly rent, retry payments, or multiple pending payments with null relatedEntity)
transactionSchema.index({ relatedEntity: 1 });
// Index on relatedEntity + relatedEntityType for efficient queries
transactionSchema.index({ relatedEntity: 1, relatedEntityType: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;