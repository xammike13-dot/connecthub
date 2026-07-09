import Wallet from '../models/Wallet.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../middleware/error.js';
import { ResponseError } from '../middleware/error.js';

/**
 * Request a withdrawal from wallet
 */
export const requestWithdrawal = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { amount, phoneNumber } = req.body;

  // Get user's wallet
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new ResponseError('Wallet not found. Please earn some money first.', 404);
  }

  // Validate amount
  if (amount <= 0) {
    throw new ResponseError('Invalid withdrawal amount', 400);
  }

  if (amount > wallet.balance) {
    throw new ResponseError(
      `Insufficient balance. Available: KES ${wallet.balance.toFixed(2)}`,
      400
    );
  }

  // Minimum withdrawal amount (e.g., KES 100)
  const MIN_WITHDRAWAL = 100;
  if (amount < MIN_WITHDRAWAL) {
    throw new ResponseError(`Minimum withdrawal amount is KES ${MIN_WITHDRAWAL}`, 400);
  }

  // Calculate withdrawal fee (e.g., 1% or fixed fee)
  const withdrawalFee = Math.max(amount * 0.01, 0); // 1% fee
  const netAmount = amount - withdrawalFee;

  // Create withdrawal record
  const withdrawal = await Withdrawal.create({
    user: userId,
    wallet: wallet._id,
    amount,
    fee: withdrawalFee,
    netAmount,
    status: 'pending',
    mpesaPhoneNumber: phoneNumber || req.user.phone,
    requestedBy: userId,
  });

  // Deduct from wallet balance immediately (hold the funds)
  wallet.balance -= amount;
  await wallet.save();

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    data: {
      withdrawalId: withdrawal._id,
      amount,
      fee: withdrawalFee,
      netAmount,
      phoneNumber: withdrawal.mpesaPhoneNumber,
      status: withdrawal.status,
    },
  });
});

/**
 * Process withdrawal (admin function)
 * Admin manually processes M-Pesa payout via their M-Pesa business account
 */
export const processWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;
  const { status, rejectionReason, mpesaReceiptNumber } = req.body;
  const adminId = req.user._id;

  const withdrawal = await Withdrawal.findById(withdrawalId)
    .populate('user')
    .populate('wallet');

  if (!withdrawal) {
    throw new ResponseError('Withdrawal not found', 404);
  }

  if (withdrawal.status !== 'pending') {
    throw new ResponseError('Withdrawal is not in pending status', 400);
  }

  if (status === 'completed') {
    // Admin has manually sent the M-Pesa payment
    withdrawal.status = 'completed';
    withdrawal.completedAt = new Date();
    withdrawal.mpesaReceiptNumber = mpesaReceiptNumber;
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();

    // Update wallet totals
    const wallet = await Wallet.findById(withdrawal.wallet);
    wallet.totalWithdrawn += withdrawal.amount;
    await wallet.save();
  } else if (status === 'failed' || status === 'cancelled') {
    withdrawal.status = 'failed';
    withdrawal.failedAt = new Date();
    withdrawal.rejectionReason = rejectionReason || 'Cancelled by admin';
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();

    // Refund to wallet
    const wallet = await Wallet.findById(withdrawal.wallet);
    wallet.balance += withdrawal.amount;
    await wallet.save();
  }

  await withdrawal.save();

  res.status(200).json({
    success: true,
    message: `Withdrawal ${status}`,
    data: withdrawal,
  });
});

/**
 * Get withdrawal history for a user
 */
export const getWithdrawalHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  const query = { user: userId };
  if (status) query.status = status;

  const withdrawals = await Withdrawal.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Withdrawal.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      withdrawals,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    },
  });
});

/**
 * Get single withdrawal details
 */
export const getWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;

  const withdrawal = await Withdrawal.findById(withdrawalId)
    .populate('user', 'firstName lastName email phone')
    .populate('processedBy', 'firstName lastName');

  if (!withdrawal) {
    throw new ResponseError('Withdrawal not found', 404);
  }

  // Check authorization
  if (
    withdrawal.user._id.toString() !== req.user._id.toString() &&
    !req.user.isAdmin
  ) {
    throw new ResponseError('Not authorized to view this withdrawal', 403);
  }

  res.status(200).json({
    success: true,
    data: withdrawal,
  });
});

/**
 * Add withdrawal method to wallet
 */
export const addWithdrawalMethod = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { phoneNumber, isDefault = false } = req.body;

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new ResponseError('Wallet not found', 404);
  }

  // Check if phone number already exists
  const exists = wallet.withdrawalMethods.find(
    (m) => m.phoneNumber === phoneNumber
  );

  if (exists) {
    throw new ResponseError('Phone number already added', 400);
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    wallet.withdrawalMethods.forEach((m) => (m.isDefault = false));
  }

  wallet.withdrawalMethods.push({
    type: 'mpesa',
    phoneNumber,
    isDefault,
  });

  await wallet.save();

  res.status(200).json({
    success: true,
    message: 'Withdrawal method added successfully',
    data: wallet.withdrawalMethods,
  });
});

/**
 * Set default withdrawal method
 */
export const setDefaultWithdrawalMethod = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { phoneNumber } = req.body;

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new ResponseError('Wallet not found', 404);
  }

  const method = wallet.withdrawalMethods.find(
    (m) => m.phoneNumber === phoneNumber
  );

  if (!method) {
    throw new ResponseError('Withdrawal method not found', 404);
  }

  wallet.withdrawalMethods.forEach((m) => {
    m.isDefault = m.phoneNumber === phoneNumber;
  });

  await wallet.save();

  res.status(200).json({
    success: true,
    message: 'Default withdrawal method updated',
    data: wallet.withdrawalMethods,
  });
});

/**
 * Get wallet details with all info
 */
export const getWalletDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    return res.status(200).json({
      success: true,
      data: {
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        totalCommissionPaid: 0,
        isVerified: false,
        withdrawalMethods: [],
      },
    });
  }

  res.status(200).json({
    success: true,
    data: wallet,
  });
});

/**
 * Get earnings statistics for dashboard
 */
export const getEarningsStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { period = '30' } = req.query; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Get completed transactions in the period
  const transactions = await Transaction.find({
    provider: userId,
    status: 'completed',
    completedAt: { $gte: startDate },
  });

  // Calculate statistics
  const totalEarnings = transactions.reduce(
    (sum, t) => sum + t.providerReceives,
    0
  );
  const totalCommission = transactions.reduce(
    (sum, t) => sum + t.commission.providerShare,
    0
  );
  const transactionCount = transactions.length;

  // Group by type
  const byType = {};
  transactions.forEach((t) => {
    if (!byType[t.type]) {
      byType[t.type] = { count: 0, earnings: 0 };
    }
    byType[t.type].count++;
    byType[t.type].earnings += t.providerReceives;
  });

  // Get daily earnings for chart
  const dailyEarnings = {};
  transactions.forEach((t) => {
    const date = new Date(t.completedAt).toISOString().split('T')[0];
    if (!dailyEarnings[date]) {
      dailyEarnings[date] = 0;
    }
    dailyEarnings[date] += t.providerReceives;
  });

  res.status(200).json({
    success: true,
    data: {
      totalEarnings,
      totalCommission,
      transactionCount,
      byType,
      dailyEarnings,
      averageTransactionValue: transactionCount > 0 ? totalEarnings / transactionCount : 0,
    },
  });
});