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
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    vendorPayout: {
      type: Number,
      default: 0,
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
      business: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      selectedVariations: { type: mongoose.Schema.Types.Mixed, default: {} },
      selectedOptions: { type: mongoose.Schema.Types.Mixed, default: {} },
      selectedAddOns: [{ name: String, price: Number }],
      addOnsTotal: { type: Number, default: 0 },
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
      enum: ['pending_payment', 'paid', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'pending', 'processing', 'completed', 'refunded'],
      default: 'pending_payment',
      index: true,
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
    mpesaReceiptNumber: { type: String, index: true },
    checkoutRequestId: { type: String, index: true },
    campusLandmark: { type: String, default: '' },
    deliveryCoordinates: {
      lat: Number,
      lng: Number,
    },
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