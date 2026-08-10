import { v4 as uuidv4 } from 'uuid';
import Wallet from '../models/Wallet.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import mpesaService from '../services/mpesaService.js';
import { asyncHandler } from '../middleware/error.js';
import { ResponseError } from '../middleware/error.js';

/**
 * Request a withdrawal from wallet
 */
export const requestWithdrawal = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { amount, phoneNumber } = req.body;

  // Validate amount type and value
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new ResponseError('Invalid withdrawal amount', 400);
  }

  // Validate phone number presence and format
  const rawPhone = phoneNumber || req.user.phone;
  if (!rawPhone) {
    throw new ResponseError('M-Pesa phone number is required', 400);
  }

  const cleanPhone = rawPhone.replace(/\s+/g, '');
  const kenyanPhoneRegex = /^(?:254|\+254|0)?([71]\d{8})$/;
  if (!kenyanPhoneRegex.test(cleanPhone)) {
    throw new ResponseError('Please provide a valid Kenyan phone number (e.g., 0712345678 or 254712345678)', 400);
  }

  // Extract digits & standardize to local '07XXXXXXXX' / '01XXXXXXXX' format
  const match = cleanPhone.match(kenyanPhoneRegex);
  const standardizedPhone = '0' + match[1];

  // Prevent duplicate withdrawal submissions (within last 10 seconds)
  const recentPending = await Withdrawal.findOne({
    user: userId,
    status: 'pending',
    createdAt: { $gte: new Date(Date.now() - 10000) }
  });
  if (recentPending) {
    throw new ResponseError('A duplicate withdrawal request was detected. Please wait a moment and try again.', 400);
  }

  // Get user's wallet
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new ResponseError('Wallet not found. Please earn some money first.', 404);
  }

  if (numericAmount > wallet.balance) {
    throw new ResponseError(
      `Insufficient balance. Available: KES ${wallet.balance.toFixed(2)}`,
      400
    );
  }

  // Minimum withdrawal amount (e.g., KES 100)
  const MIN_WITHDRAWAL = 100;
  if (numericAmount < MIN_WITHDRAWAL) {
    throw new ResponseError(`Minimum withdrawal amount is KES ${MIN_WITHDRAWAL}`, 400);
  }

  // Calculate withdrawal fee (e.g., 1% or fixed fee)
  const withdrawalFee = Math.max(numericAmount * 0.01, 0); // 1% fee
  const netAmount = numericAmount - withdrawalFee;

  // Generate a unique originator conversation ID for this payout request
  const originatorConversationId = `B2C-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Create withdrawal record
  const withdrawal = await Withdrawal.create({
    user: userId,
    wallet: wallet._id,
    amount: numericAmount,
    fee: withdrawalFee,
    netAmount,
    status: 'pending',
    mpesaPhoneNumber: standardizedPhone,
    requestedBy: userId,
    originatorConversationId,
  });

  // Escrow flow: Deduct from available balance immediately, hold in pendingBalance
  const beforeBalance = wallet.balance;
  const beforePending = wallet.pendingBalance || 0;
  wallet.balance -= numericAmount;
  wallet.pendingBalance = beforePending + numericAmount;
  await wallet.save();

  console.log('[WALLET WITHDRAWAL LOCKUP]', {
    walletId: wallet._id,
    userId,
    amount: numericAmount,
    beforeBalance,
    afterBalance: wallet.balance,
    beforePending,
    afterPending: wallet.pendingBalance,
  });

  // Call Safaricom B2C API for payout
  const b2cResponse = await mpesaService.initiateB2C({
    phoneNumber: standardizedPhone,
    amount: netAmount, // Safaricom disburses the net amount
    originatorConversationId,
  });

  if (!b2cResponse.success) {
    // If payout request fails at initiation stage (e.g. invalid credential, offline API, missing config)
    // We do NOT fake a successful payout. We fail it immediately and restore wallet balances
    withdrawal.status = 'failed';
    withdrawal.failedAt = new Date();
    withdrawal.rejectionReason = b2cResponse.message || 'Safaricom B2C payout initiation failed';
    withdrawal.notes = `Initiation failed: ${JSON.stringify(b2cResponse.error || b2cResponse.message)}`;
    await withdrawal.save();

    // Restore wallet balances
    wallet.balance += numericAmount;
    wallet.pendingBalance = Math.max(0, wallet.pendingBalance - numericAmount);
    await wallet.save();

    console.log('[WALLET WITHDRAWAL ROLLBACK]', {
      walletId: wallet._id,
      userId,
      amount: numericAmount,
      reason: 'B2C initiation failed',
      restoredBalance: wallet.balance,
      restoredPending: wallet.pendingBalance,
    });

    throw new ResponseError(
      `M-Pesa payout initiation failed: ${b2cResponse.message}. Please verify the Safaricom environment configuration or B2C certificate status.`,
      400
    );
  }

  // Update withdrawal with B2C accepted response details
  withdrawal.conversationId = b2cResponse.data?.ConversationID;
  withdrawal.b2cResponse = b2cResponse.data;
  withdrawal.status = 'pending'; // Keep status as pending while awaiting webhook callback
  await withdrawal.save();

  res.status(201).json({
    success: true,
    message: 'Withdrawal request accepted and is processing via Safaricom M-Pesa B2C',
    data: {
      withdrawalId: withdrawal._id,
      amount: numericAmount,
      fee: withdrawalFee,
      netAmount,
      phoneNumber: withdrawal.mpesaPhoneNumber,
      status: withdrawal.status,
      originatorConversationId,
      conversationId: withdrawal.conversationId,
    },
  });
});

/**
 * Handle Safaricom B2C Webhook Callback
 * Receives POST from Safaricom with the actual transaction outcome
 */
export const mpesaB2CCallback = asyncHandler(async (req, res) => {
  console.log('════════════════ [B2C Webhook Callback Received] ════════════════');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('════════════════════════════════════════════════════════════════');

  const b2cResult = req.body?.Result;
  if (!b2cResult) {
    console.error('[B2C Webhook] Missing Result payload');
    return res.status(400).json({ success: false, message: 'Invalid callback format' });
  }

  const {
    OriginatorConversationID,
    ConversationID,
    ResultCode,
    ResultDesc,
    ResultParameters,
    ReferenceData,
  } = b2cResult;

  // Find the matching withdrawal record
  const withdrawal = await Withdrawal.findOne({
    $or: [
      { originatorConversationId: OriginatorConversationID },
      { conversationId: ConversationID },
    ]
  }).populate('wallet');

  if (!withdrawal) {
    console.error('[B2C Webhook] Matching withdrawal record not found for:', {
      OriginatorConversationID,
      ConversationID,
    });
    return res.status(404).json({ success: false, message: 'Withdrawal not found' });
  }

  // Double-processing check
  if (withdrawal.status === 'completed' || withdrawal.status === 'failed') {
    console.log('[B2C Webhook] Withdrawal already processed:', withdrawal._id);
    return res.status(200).json({ success: true, message: 'Already processed' });
  }

  const wallet = withdrawal.wallet;
  const isSuccess = Number(ResultCode) === 0;

  withdrawal.b2cCallbackData = req.body;

  if (isSuccess) {
    // 1. SUCCESS: pendingBalance decreases and totalWithdrawn increases
    withdrawal.status = 'completed';
    withdrawal.completedAt = new Date();
    withdrawal.processedAt = new Date();

    // Try extracting M-Pesa Receipt Number from ResultParameters
    let receiptNumber = null;
    if (ResultParameters && Array.isArray(ResultParameters.ResultParameter)) {
      const receiptItem = ResultParameters.ResultParameter.find(
        (param) => param.Key === 'TransactionReceipt'
      );
      if (receiptItem) {
        receiptNumber = receiptItem.Value;
      }
    }
    withdrawal.mpesaReceiptNumber = receiptNumber;

    if (wallet) {
      wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - withdrawal.amount);
      wallet.totalWithdrawn = (wallet.totalWithdrawn || 0) + withdrawal.amount;
      await wallet.save();

      console.log('[WALLET B2C SUCCESS UPDATE]', {
        walletId: wallet._id,
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        pendingBalance: wallet.pendingBalance,
        totalWithdrawn: wallet.totalWithdrawn,
      });
    }
  } else {
    // 2. FAILURE: restore amount to availableBalance, decrease pendingBalance, and mark failed
    withdrawal.status = 'failed';
    withdrawal.failedAt = new Date();
    withdrawal.processedAt = new Date();
    withdrawal.rejectionReason = ResultDesc || `M-Pesa B2C callback failed with code ${ResultCode}`;

    if (wallet) {
      wallet.balance = (wallet.balance || 0) + withdrawal.amount;
      wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - withdrawal.amount);
      await wallet.save();

      console.log('[WALLET B2C FAILURE ROLLBACK]', {
        walletId: wallet._id,
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
      });
    }
  }

  await withdrawal.save();
  return res.status(200).json({ success: true, message: 'Callback processed successfully' });
});

/**
 * Handle Safaricom B2C Timeout Webhook
 * Occurs if Safaricom fails to disburse or the queue times out
 */
export const mpesaB2CTimeout = asyncHandler(async (req, res) => {
  console.log('════════════════ [B2C Webhook Timeout Received] ════════════════');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('════════════════════════════════════════════════════════════════');

  // Typically, Daraja sends timeout callbacks to QueueTimeOutURL. We will treat it as a failure.
  const payload = req.body;
  const originatorConvId = payload?.OriginatorConversationID;
  const convId = payload?.ConversationID;

  const withdrawal = await Withdrawal.findOne({
    $or: [
      { originatorConversationId: originatorConvId },
      { conversationId: convId },
    ]
  }).populate('wallet');

  if (!withdrawal) {
    console.error('[B2C Timeout] Matching withdrawal record not found');
    return res.status(404).json({ success: false, message: 'Withdrawal not found' });
  }

  if (withdrawal.status === 'completed' || withdrawal.status === 'failed') {
    return res.status(200).json({ success: true, message: 'Already processed' });
  }

  const wallet = withdrawal.wallet;
  withdrawal.status = 'failed';
  withdrawal.failedAt = new Date();
  withdrawal.processedAt = new Date();
  withdrawal.rejectionReason = 'Safaricom B2C request timed out in queue';
  withdrawal.b2cCallbackData = payload;

  if (wallet) {
    wallet.balance = (wallet.balance || 0) + withdrawal.amount;
    wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - withdrawal.amount);
    await wallet.save();

    console.log('[WALLET B2C TIMEOUT ROLLBACK]', {
      walletId: wallet._id,
      withdrawalId: withdrawal._id,
      amount: withdrawal.amount,
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
    });
  }

  await withdrawal.save();
  return res.status(200).json({ success: true, message: 'Timeout processed successfully' });
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
    req.user.role !== 'admin'
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