import mongoose from 'mongoose';

/**
 * Payment Model
 * Tracks MPesa STK Push payments and their status
 * 
 * This model is specifically for MPesa Daraja API payments.
 * It tracks the entire payment lifecycle from STK Push initiation
 * to final confirmation or failure.
 */

const paymentSchema = new mongoose.Schema({
  // Customer who initiated the payment
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Provider (rider, landlord, business) - may be null until payment confirmed
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Payment amount details
  amount: {
    type: Number,
    required: true,
  },

  // M-Pesa phone number used for payment
  phoneNumber: {
    type: String,
    required: true,
  },

  // Daraja API identifiers
  checkoutRequestID: {
    type: String,
    sparse: true,
  },
  
  merchantRequestID: {
    type: String,
    sparse: true,
  },

  // M-Pesa receipt number (after successful payment)
  mpesaReceiptNumber: {
    type: String,
    sparse: true,
  },

  // Payment status: PENDING, SUCCESS, FAILED, CANCELLED
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
  },

  // Type of payment: ride, order, rental
  rideType: {
    type: String,
    enum: ['ride', 'order', 'rental'],
    required: true,
  },

  // Reference to the related entity (RideRequest, Order, Rental)
  rideReference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityType',
  },

  // Type of related entity
  relatedEntityType: {
    type: String,
    enum: ['RideRequest', 'Order', 'Rental', 'ride', 'rideRequest', 'order', 'rental'],
  },

  // Transaction reference (our internal reference)
  transactionRef: {
    type: String,
    required: true,
    unique: true,
  },

  // Daraja callback data (stored for debugging)
  callbackData: {
    type: Object,
  },

  // STK Push response data
  stkPushResponse: {
    type: Object,
  },

  // Error message if payment failed
  errorMessage: {
    type: String,
  },

  // When payment was confirmed
  paidAt: {
    type: Date,
  },

  // When this record was created
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // When this record was last updated
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying
paymentSchema.index({ checkoutRequestID: 1 });
paymentSchema.index({ transactionRef: 1 });
paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ rideReference: 1 });

// Update the updatedAt timestamp before saving
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to create a payment record
paymentSchema.statics.createPayment = async function(paymentData) {
  return this.create({
    customer: paymentData.customer,
    provider: paymentData.provider || null,
    amount: paymentData.amount,
    phoneNumber: paymentData.phoneNumber,
    status: 'PENDING',
    rideType: paymentData.rideType,
    rideReference: paymentData.rideReference || null,
    relatedEntityType: paymentData.relatedEntityType,
    transactionRef: paymentData.transactionRef,
  });
};

// Instance method to mark payment as successful
paymentSchema.methods.markSuccess = async function(darajaData) {
  this.status = 'SUCCESS';
  this.paidAt = new Date();
  
  if (darajaData) {
    this.mpesaReceiptNumber = darajaData.mpesaReceiptNumber;
    this.checkoutRequestID = darajaData.checkoutRequestID;
    this.merchantRequestID = darajaData.merchantRequestID;
    this.callbackData = darajaData;
  }
  
  await this.save();
  return this;
};

// Instance method to mark payment as failed
paymentSchema.methods.markFailed = async function(errorMessage) {
  this.status = 'FAILED';
  this.errorMessage = errorMessage;
  await this.save();
  return this;
};

// Instance method to mark payment as cancelled
paymentSchema.methods.markCancelled = async function() {
  this.status = 'CANCELLED';
  await this.save();
  return this;
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;