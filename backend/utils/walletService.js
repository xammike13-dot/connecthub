import Wallet from '../models/Wallet.js';

/**
 * Credit provider escrow (pending balance) after successful payment.
 */
export const creditPendingEscrow = async (userId, amount, movementType = 'payment_received') => {
  if (!userId || !amount || amount <= 0) return null;

  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({
      user: userId,
      balance: 0,
      pendingBalance: amount,
      totalEarnings: 0,
    });
    console.log('[WALLET MOVEMENT]', {
      walletId: wallet._id,
      userId,
      amount,
      beforePending: 0,
      afterPending: wallet.pendingBalance,
      beforeBalance: 0,
      afterBalance: wallet.balance,
      movementType,
    });
    return wallet;
  }

  const beforePending = wallet.pendingBalance;
  const beforeBalance = wallet.balance;
  wallet.pendingBalance += amount;
  await wallet.save();

  console.log('[WALLET MOVEMENT]', {
    walletId: wallet._id,
    userId,
    amount,
    beforePending,
    afterPending: wallet.pendingBalance,
    beforeBalance,
    afterBalance: wallet.balance,
    movementType,
  });

  return wallet;
};

/**
 * Release escrow from pending to available balance after customer confirmation.
 */
export const releaseEscrow = async (userId, amount, movementType = 'escrow_release') => {
  if (!userId || !amount || amount <= 0) return null;

  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({
      user: userId,
      balance: amount,
      pendingBalance: 0,
      totalEarnings: amount,
    });
    console.log('[WALLET MOVEMENT]', {
      walletId: wallet._id,
      userId,
      amount,
      beforePending: 0,
      afterPending: 0,
      beforeBalance: 0,
      afterBalance: wallet.balance,
      movementType,
    });
    return wallet;
  }

  const beforePending = wallet.pendingBalance;
  const beforeBalance = wallet.balance;

  wallet.pendingBalance = Math.max(0, wallet.pendingBalance - amount);
  wallet.balance += amount;
  wallet.totalEarnings += amount;
  await wallet.save();

  console.log('[WALLET MOVEMENT]', {
    walletId: wallet._id,
    userId,
    amount,
    beforePending,
    afterPending: wallet.pendingBalance,
    beforeBalance,
    afterBalance: wallet.balance,
    movementType,
  });

  return wallet;
};

export default { creditPendingEscrow, releaseEscrow };
