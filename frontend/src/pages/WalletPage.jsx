import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { businessAPI, riderAPI, landlordAPI, withdrawalAPI, walletAPI } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const WalletPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({ amount: '', phoneNumber: user?.phone || '' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 0, currentPage: 1 });

  useEffect(() => {
    fetchWalletData();
    fetchWithdrawalHistory();
  }, []);

  const fetchWalletData = async () => {
    try {
      let data;
      if (user?.role === 'rider') {
        // Use rider API for riders
        const response = await riderAPI.getProfile();
        data = response.data.data.wallet;
      } else if (user?.role === 'business') {
        // Use business API for business
        const response = await businessAPI.getWallet();
        data = response.data.data;
      } else if (user?.role === 'landlord') {
        // Use landlord API for landlords
        const response = await landlordAPI.getWallet();
        data = response.data.data;
      } else {
        // Use generic wallet API for customers
        const response = await walletAPI.getBalance();
        data = response.data.data;
      }
      setWallet(data);
    } catch (err) {
      console.error('Error fetching wallet:', err);
      addToast('Failed to fetch wallet data', 'error');
      // Set default wallet state
      setWallet({
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        withdrawalMethods: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      // Use the generic withdrawal API which works for all roles
      const { data } = await withdrawalAPI.getMyWithdrawals();
      setWithdrawals(data.data?.withdrawals || data.data || []);
      setPagination(data.data?.pagination || { total: 0, pages: 0, currentPage: 1 });
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      // Set empty state on error
      setWithdrawals([]);
      setPagination({ total: 0, pages: 0, currentPage: 1 });
    }
  };

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    if (!withdrawalData.amount || parseFloat(withdrawalData.amount) <= 0) {
      setError('Please enter a valid amount');
      setProcessing(false);
      return;
    }

    if (parseFloat(withdrawalData.amount) > (wallet?.balance || 0)) {
      setError('Insufficient balance');
      setProcessing(false);
      return;
    }

    if (parseFloat(withdrawalData.amount) < 100) {
      setError('Minimum withdrawal amount is KES 100');
      setProcessing(false);
      return;
    }

    if (!withdrawalData.phoneNumber) {
      setError('Please enter a phone number');
      setProcessing(false);
      return;
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^0[79]\d{8}$/;
    if (!phoneRegex.test(withdrawalData.phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      setProcessing(false);
      return;
    }

    try {
      const { data } = await withdrawalAPI.request({
        amount: parseFloat(withdrawalData.amount),
        phoneNumber: withdrawalData.phoneNumber.replace(/\s/g, ''),
      });

      if (data.success) {
        addToast('Withdrawal request submitted successfully', 'success');
        setShowWithdrawModal(false);
        setWithdrawalData({ amount: '', phoneNumber: user?.phone || '' });
        fetchWalletData();
        fetchWithdrawalHistory();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to process withdrawal';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isProvider = ['landlord', 'business', 'rider'].includes(user?.role);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">Wallet & Earnings</h1>
          <p className="text-secondary-500 mt-1">Manage your earnings and withdrawals</p>
        </div>
        {isProvider && wallet?.balance > 0 && (
          <Button
            variant="primary"
            onClick={() => setShowWithdrawModal(true)}
          >
            Withdraw Funds
          </Button>
        )}
      </div>

      {/* Wallet Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(wallet?.balance || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-secondary-400 mt-2">Ready to withdraw</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Pending Balance</p>
              <p className="text-3xl font-bold text-yellow-600">
                {formatCurrency(wallet?.pendingBalance || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-secondary-400 mt-2">Awaiting completion</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Total Earnings</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(wallet?.totalEarnings || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-secondary-400 mt-2">All time earnings</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Total Withdrawn</p>
              <p className="text-3xl font-bold text-secondary-800">
                {formatCurrency(wallet?.totalWithdrawn || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-secondary-400 mt-2">Total withdrawals</p>
        </div>
      </div>

      {/* Withdrawal Methods */}
      {isProvider && (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">Withdrawal Methods</h2>
          {wallet?.withdrawalMethods?.length > 0 ? (
            <div className="space-y-3">
              {wallet.withdrawalMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <div>
                      <p className="font-medium text-secondary-800">M-Pesa</p>
                      <p className="text-sm text-secondary-500">{method.phoneNumber}</p>
                    </div>
                  </div>
                  {method.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-secondary-500 mb-4">No withdrawal methods added yet</p>
              <p className="text-sm text-secondary-400">Your M-Pesa number will be used for withdrawals</p>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal History */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Withdrawal History</h2>
        {withdrawals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-800">
                      {formatCurrency(withdrawal.amount || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                      {formatCurrency(withdrawal.fee || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-800">
                      {formatCurrency(withdrawal.netAmount || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                      {withdrawal.mpesaPhoneNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(withdrawal.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-secondary-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <p className="text-secondary-500">No withdrawals yet</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (pagination.currentPage > 1) {
                  setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }));
                  fetchWithdrawalHistory();
                }
              }}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (pagination.currentPage < pagination.pages) {
                  setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }));
                  fetchWithdrawalHistory();
                }
              }}
              disabled={pagination.currentPage === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setError('');
        }}
        title="Request Withdrawal"
        size="sm"
      >
        <form onSubmit={handleWithdrawalRequest} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Amount (KES)
            </label>
            <Input
              type="number"
              value={withdrawalData.amount}
              onChange={(e) => setWithdrawalData({ ...withdrawalData, amount: e.target.value })}
              placeholder="Enter amount"
              min="100"
              max={wallet?.balance}
              fullWidth
            />
            <p className="text-xs text-secondary-500 mt-1">
              Minimum: KES 100 | Available: {formatCurrency(wallet?.balance || 0)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              M-Pesa Phone Number
            </label>
            <Input
              type="tel"
              value={withdrawalData.phoneNumber}
              onChange={(e) => setWithdrawalData({ ...withdrawalData, phoneNumber: e.target.value })}
              placeholder="e.g., 0712345678"
              fullWidth
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <Button type="button" variant="outline" onClick={() => setShowWithdrawModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={processing}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WalletPage;