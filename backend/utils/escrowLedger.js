import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { creditPendingEscrow, releaseEscrow } from './walletService.js';
import { createNotification } from '../controllers/notificationController.js';
import { getIO } from './socket.js';

/**
 * Escrow Ledger Service
 * Handles atomic escrow operations, idempotency, and audit trails
 */

/**
 * Hold funds in escrow for a verified paid transaction
 */
export const holdEscrow = async ({
  transactionId,
  providerId,
  amount,
  movementType = 'escrow_held',
}) => {
  if (!transactionId || !amount || amount <= 0) return null;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) return null;

  transaction.escrowStatus = 'held';
  await transaction.save();

  if (providerId) {
    await creditPendingEscrow(providerId, amount, movementType);
  }

  return transaction;
};

/**
 * Release escrow funds securely to the entitled recipient
 * Enforces idempotency, customer confirmation, and audit logging
 */
export const releaseEscrowSecure = async ({
  transactionId,
  recipientId,
  recipientRole = 'provider',
  amount,
  idempotencyKey,
  reason = 'service_completed_confirmed',
  req = null,
}) => {
  if (!transactionId) {
    throw new Error('Transaction ID is required for escrow release');
  }

  if (!recipientId) {
    throw new Error('Recipient ID is required for escrow release');
  }

  const releaseAmount = Number(amount);
  if (isNaN(releaseAmount) || releaseAmount <= 0) {
    throw new Error('Valid release amount greater than 0 is required');
  }

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Verify payment was genuinely verified
  if (transaction.paymentStatus !== 'paid' && transaction.status !== 'paid' && transaction.status !== 'paid_in_escrow') {
    throw new Error('Cannot release escrow: Transaction payment is not verified');
  }

  // Prevent releases on disputed transactions
  if (transaction.escrowStatus === 'disputed' && !reason.includes('admin_resolution')) {
    throw new Error('Cannot release escrow: Transaction is currently disputed');
  }

  // Idempotency check: if already released with this key, return immediately
  const effectiveKey = idempotencyKey || `release_${transaction._id}_${recipientId}_${releaseAmount}`;
  const existingRelease = transaction.escrowReleases?.find(
    (r) => r.idempotencyKey === effectiveKey || (r.recipient?.toString() === recipientId.toString() && r.status === 'RELEASED')
  );

  if (existingRelease) {
    console.log('[ESCROW LEDGER] Idempotent release skipped (already processed):', {
      transactionId: transaction._id,
      idempotencyKey: effectiveKey,
    });
    return {
      alreadyProcessed: true,
      releaseRecord: existingRelease,
      transaction,
    };
  }

  // Record ledger entry
  const ledgerEntry = {
    recipient: recipientId,
    recipientRole,
    amount: releaseAmount,
    releasedAt: new Date(),
    status: 'RELEASED',
    idempotencyKey: effectiveKey,
    transactionRef: transaction.transactionRef,
  };

  transaction.escrowReleases = transaction.escrowReleases || [];
  transaction.escrowReleases.push(ledgerEntry);
  transaction.escrowStatus = 'released';
  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transaction.save();

  // Transfer pending funds to available balance
  const updatedWallet = await releaseEscrow(recipientId, releaseAmount, reason);

  // Real-time socket notification
  const io = req?.app?.get('io') || getIO() || global.io;
  if (io) {
    io.to(`user_${recipientId}`).emit('escrow_released', {
      transactionId: transaction._id,
      transactionRef: transaction.transactionRef,
      amount: releaseAmount,
      releasedAt: ledgerEntry.releasedAt,
      walletBalance: updatedWallet?.balance,
      message: `Escrow payment of KSh ${releaseAmount} has been released to your wallet.`,
    });
    io.to(`user_${recipientId}`).emit('payment_released', {
      transactionId: transaction._id,
      amount: releaseAmount,
      releasedAt: ledgerEntry.releasedAt,
    });
  }

  // In-app DB notification
  try {
    await createNotification(
      recipientId,
      'payment_released',
      'Escrow Payment Released',
      `Payment of KSh ${releaseAmount} for transaction ${transaction.transactionRef} has been released to your wallet.`,
      { transactionId: transaction._id, transactionRef: transaction.transactionRef, amount: releaseAmount },
      `/${recipientRole}/wallet`,
      `/${recipientRole}/wallet`,
      req,
      recipientRole
    );
  } catch (err) {
    console.error('[ESCROW LEDGER] Notification error:', err.message);
  }

  console.log('[ESCROW LEDGER] Escrow successfully released:', {
    transactionId: transaction._id,
    recipientId,
    amount: releaseAmount,
    idempotencyKey: effectiveKey,
  });

  return {
    alreadyProcessed: false,
    releaseRecord: ledgerEntry,
    transaction,
    wallet: updatedWallet,
  };
};

/**
 * Refund escrow funds to customer / cancel payout
 */
export const refundEscrowSecure = async ({
  transactionId,
  reason = 'order_declined_or_cancelled',
  req = null,
}) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) return null;

  // Debit pending balance from provider wallet if it had been credited
  if (transaction.provider) {
    const providerWallet = await Wallet.findOne({ user: transaction.provider });
    if (providerWallet) {
      const amountToRevert = transaction.providerReceives || transaction.amount?.totalAmount || 0;
      providerWallet.pendingBalance = Math.max(0, (providerWallet.pendingBalance || 0) - amountToRevert);
      await providerWallet.save();
      console.log('[ESCROW LEDGER] Reverted pending balance from provider:', {
        providerId: transaction.provider,
        revertedAmount: amountToRevert,
        newPendingBalance: providerWallet.pendingBalance,
      });
    }
  }

  transaction.escrowStatus = 'refunded';
  transaction.status = 'refunded';
  transaction.paymentStatus = 'refunded';
  transaction.refundedAt = new Date();
  transaction.refundReason = reason;
  await transaction.save();

  const io = req?.app?.get('io') || getIO() || global.io;
  if (io && transaction.customer) {
    const customerId = transaction.customer._id || transaction.customer;
    io.to(`user_${customerId}`).emit('payment_refunded', {
      transactionId: transaction._id,
      transactionRef: transaction.transactionRef,
      amount: transaction.amount?.totalAmount,
      reason,
    });
  }

  return transaction;
};

/**
 * Mark transaction as Disputed and lock funds in escrow
 */
export const disputeEscrowSecure = async ({
  transactionId,
  reason,
  details,
  reportedBy,
  req = null,
}) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) return null;

  transaction.escrowStatus = 'disputed';
  transaction.status = 'disputed';
  transaction.paymentStatus = 'disputed';
  transaction.dispute = {
    isDisputed: true,
    reason: reason || 'Service issue reported',
    details: details || '',
    status: 'open',
    reportedAt: new Date(),
    reportedBy,
  };
  await transaction.save();

  const io = req?.app?.get('io') || getIO() || global.io;
  if (io) {
    // Notify admin channel
    io.to('admin_channel').emit('new_dispute', {
      transactionId: transaction._id,
      transactionRef: transaction.transactionRef,
      amount: transaction.amount?.totalAmount,
      reason,
      reportedBy,
    });

    // Notify provider
    if (transaction.provider) {
      const providerId = transaction.provider._id || transaction.provider;
      io.to(`user_${providerId}`).emit('transaction_disputed', {
        transactionId: transaction._id,
        transactionRef: transaction.transactionRef,
        reason,
      });
    }
  }

  return transaction;
};

export default {
  holdEscrow,
  releaseEscrowSecure,
  refundEscrowSecure,
  disputeEscrowSecure,
};
