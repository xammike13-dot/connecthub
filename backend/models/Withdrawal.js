import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['mpesa'],
      default: 'mpesa',
    },
    mpesaPhoneNumber: {
      type: String,
      required: true,
    },
    mpesaReceiptNumber: {
      type: String,
    },
    rejectionReason: String,
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    notes: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
withdrawalSchema.index({ user: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;