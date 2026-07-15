import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';

/**
 * Centralized Wallet Calculation Service
 * 
 * This service provides a single source of truth for all wallet balance calculations
 * across Dashboard, Wallet Page, Earnings Page, and Withdrawal Page.
 * 
 * Balance Rules:
 * - Available Balance: money released after tenant/customer confirms move-in/completion
 * - Pending Balance: money held in escrow waiting for tenant/customer confirmation
 * - Total Earnings: all released earnings since account creation
 * - Total Withdrawn: all successful withdrawals
 * - Monthly Earnings: released earnings for current month only
 * - Pending Earnings: current unreleased escrow funds
 */

/**
 * Get or create wallet for a user
 */
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  
  return wallet;
};

/**
 * Calculate wallet balances for any user role (landlord, business, rider)
 * 
 * @param {ObjectId} userId - The user ID
 * @param {string} role - The user role (landlord, business, rider)
 * @returns {Object} Wallet balance data
 */
export const calculateWalletBalances = async (userId, role = null) => {
  // Get or create wallet
  const wallet = await getOrCreateWallet(userId);
  
  // Get wallet fields
  const availableBalance = wallet.balance || 0;
  const pendingBalance = wallet.pendingBalance || 0;
  const totalEarnings = wallet.totalEarnings || 0;
  const totalWithdrawn = wallet.totalWithdrawn || 0;
  const totalCommissionPaid = wallet.totalCommissionPaid || 0;
  
  // Calculate monthly earnings (current month only)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Query completed transactions for the current month
  const monthlyCompletedTransactions = await Transaction.find({
    provider: userId,
    status: 'completed',
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  }).lean();
  
  const monthlyEarnings = monthlyCompletedTransactions.reduce(
    (sum, t) => sum + (t.providerReceives || 0), 0
  );
  
  // Query pending transactions (paid but not completed)
  const pendingTransactions = await Transaction.find({
    provider: userId,
    status: 'paid',
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  }).lean();
  
  const pendingEarnings = pendingTransactions.reduce(
    (sum, t) => sum + (t.providerReceives || 0), 0
  );
  
  // Get withdrawal methods from wallet if available
  const withdrawalMethods = wallet.withdrawalMethods || [];
  
  console.log('[WALLET CALCULATION SERVICE]', {
    userId,
    role,
    walletId: wallet._id,
    availableBalance,
    pendingBalance,
    totalEarnings,
    totalWithdrawn,
    monthlyEarnings,
    pendingEarnings,
  });
  
  return {
    walletId: wallet._id,
    availableBalance,
    pendingBalance,
    totalEarnings,
    totalWithdrawn,
    totalCommissionPaid,
    monthlyEarnings,
    pendingEarnings,
    withdrawalMethods,
  };
};

/**
 * Get wallet data for dashboard display
 * Includes all balance fields needed for dashboard cards
 */
export const getDashboardWalletData = async (userId, role = null) => {
  const balances = await calculateWalletBalances(userId, role);
  
  return {
    availableBalance: balances.availableBalance,
    pendingBalance: balances.pendingBalance,
    totalEarnings: balances.totalEarnings, // Return all-time earnings for consistent dashboard stats
    totalWithdrawn: balances.totalWithdrawn,
    pendingEarnings: balances.pendingEarnings,
  };
};

/**
 * Get wallet data for wallet page display
 * Includes all balance fields needed for wallet page
 */
export const getWalletPageData = async (userId, role = null) => {
  const balances = await calculateWalletBalances(userId, role);
  
  return {
    _id: balances.walletId,
    balance: balances.availableBalance,
    pendingBalance: balances.pendingBalance,
    totalEarnings: balances.totalEarnings, // Wallet page shows all-time earnings
    totalWithdrawn: balances.totalWithdrawn,
    totalCommissionPaid: balances.totalCommissionPaid,
    withdrawalMethods: balances.withdrawalMethods,
  };
};

/**
 * Get wallet data for earnings page display
 */
export const getEarningsPageData = async (userId, role = null) => {
  const balances = await calculateWalletBalances(userId, role);
  
  return {
    totalEarnings: balances.totalEarnings,
    monthlyEarnings: balances.monthlyEarnings,
    pendingEarnings: balances.pendingEarnings,
    availableBalance: balances.availableBalance,
  };
};

/**
 * Get wallet data for withdrawal page display
 */
export const getWithdrawalPageData = async (userId, role = null) => {
  const balances = await calculateWalletBalances(userId, role);
  
  return {
    availableBalance: balances.availableBalance,
    totalWithdrawn: balances.totalWithdrawn,
    withdrawalMethods: balances.withdrawalMethods,
  };
};

export default {
  calculateWalletBalances,
  getDashboardWalletData,
  getWalletPageData,
  getEarningsPageData,
  getWithdrawalPageData,
};
