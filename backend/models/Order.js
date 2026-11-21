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
      variantId: { type: mongoose.Schema.Types.ObjectId },
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
      enum: [
        'pending_payment',
        'paid_in_escrow',
        'awaiting_acceptance',
        'accepted',
        'preparing',
        'ready_for_pickup',
        'rider_assigned',
        'going_to_pickup',
        'arrived_at_pickup',
        'package_collected',
        'in_transit',
        'arrived_at_destination',
        'awaiting_customer_confirmation',
        'out_for_delivery',
        'delivered',
        'completed',
        'released',
        'declined',
        'refund_pending',
        'refunded',
        'disputed',
        'pending',
        'paid',
        'processing',
        'cancelled',
      ],
      default: 'pending_payment',
      index: true,
    },
    escrowStatus: {
      type: String,
      enum: ['none', 'held', 'released', 'refunded', 'disputed'],
      default: 'none',
      index: true,
    },
    deliveryStage: {
      type: String,
      enum: [
        'unassigned',
        'assigned',
        'going_to_pickup',
        'arrived_at_pickup',
        'package_collected',
        'in_transit',
        'arrived_at_destination',
        'delivered',
        'completed',
      ],
      default: 'unassigned',
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
      enum: ['accepted', 'cancelled', 'declined', null],
      default: null,
    },
    estimatedDeliveryTime: String, // e.g., "2 hours", "1 day", "3 days"
    cancellationReason: String,
    declineReason: String,
    riderAcceptedAt: Date,

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