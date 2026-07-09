import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    orderType: {
      type: String,
      enum: ['marketplace', 'healthcare'],
      required: true,
    },
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      name: String,
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
      variant: String,
      image: String,
    }],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'delivered', 'completed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['mpesa', 'card', 'cash'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: String,
    mpesaReceiptNumber: String,
    deliveryAddress: {
      phone: String,
      address: String,
      neighborhood: String,
      landmark: String,
      city: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
        },
      },
    },
    deliveryLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    trackingHistory: [{
      status: String,
      location: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      note: String,
    }],
    notes: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    completedAt: Date,

    // Business response fields
    businessResponse: {
      type: String,
      enum: ['accepted', 'cancelled', null],
      default: null,
    },
    estimatedDeliveryTime: String, // e.g., "2 hours", "1 day", "3 days"
    cancellationReason: String,

    // Customer delivery confirmation fields
    deliveryConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deliveryConfirmedAt: Date,
    deliveryConfirmationCode: String, // Optional: OTP for verification

    // Customer soft delete/archive
    hiddenByCustomer: {
      type: Boolean,
      default: false,
    },
    archivedByCustomer: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying orders by customer and status
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;