import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Download, Eye, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

const TransactionHistoryPage = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [pagination.currentPage, filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10,
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/payments/transactions?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setFilteredTransactions(response.data.data.transactions);
        setPagination({
          currentPage: response.data.data.currentPage,
          totalPages: response.data.data.totalPages,
          total: response.data.data.total,
        });
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (filters.search) {
      const filtered = transactions.filter(
        (t) =>
          t.transactionRef.toLowerCase().includes(filters.search.toLowerCase()) ||
          t.mpesaReceiptNumber?.toLowerCase().includes(filters.search.toLowerCase())
      );
      setFilteredTransactions(filtered);
    } else {
      fetchTransactions();
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };

    const icons = {
      pending: <Clock className="w-4 h-4 mr-1" />,
      paid: <CheckCircle className="w-4 h-4 mr-1" />,
      completed: <CheckCircle className="w-4 h-4 mr-1" />,
      failed: <XCircle className="w-4 h-4 mr-1" />,
      refunded: <AlertCircle className="w-4 h-4 mr-1" />,
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const labels = {
      order: 'Order',
      rental: 'Rental',
      healthcare: 'Healthcare',
      ride: 'Ride',
    };
    return labels[type] || type;
  };

  const isCustomer = user?.role === 'customer';
  const isProvider = ['landlord', 'business', 'rider'].includes(user?.role);

  const viewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const exportTransactions = () => {
    const headers = ['Date', 'Reference', 'Type', 'Status', 'Amount', 'Commission', 'Provider Receives'];
    const csvContent = [
      headers.join(','),
      ...transactions.map((t) => [
        new Date(t.createdAt).toLocaleDateString(),
        t.transactionRef,
        t.type,
        t.status,
        t.amount.totalAmount,
        t.commission.totalCommission,
        t.commission.providerReceives,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Transaction History</h1>
          <button
            onClick={exportTransactions}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold">{pagination.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {transactions.filter((t) => t.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {transactions.filter((t) => t.status === 'pending' || t.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {transactions.filter((t) => t.status === 'failed').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by reference or receipt number..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>

            <div className="flex gap-4">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="order">Orders</option>
                <option value="rental">Rentals</option>
                <option value="healthcare">Healthcare</option>
                <option value="ride">Rides</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium">{transaction.transactionRef}</div>
                        {transaction.mpesaReceiptNumber && (
                          <div className="text-xs text-gray-500">{transaction.mpesaReceiptNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full capitalize">
                          {getTypeLabel(transaction.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        KES {transaction.amount.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KES {transaction.commission.totalCommission.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => viewTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.currentPage - 1) * 10 + 1} to{' '}
                {Math.min(pagination.currentPage * 10, pagination.total)} of {pagination.total}{' '}
                transactions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Detail Modal */}
        {showModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Transaction Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Transaction Reference</p>
                    <p className="font-mono font-medium">{selectedTransaction.transactionRef}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div>{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium capitalize">{getTypeLabel(selectedTransaction.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium capitalize">{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-medium">KES {selectedTransaction.amount.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Base Amount</p>
                    <p className="font-medium">KES {selectedTransaction.amount.baseAmount.toLocaleString()}</p>
                  </div>
                  {selectedTransaction.amount.deliveryFee > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Delivery Fee</p>
                      <p className="font-medium">KES {selectedTransaction.amount.deliveryFee.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Platform Fee (10%)</p>
                    <p className="font-medium">KES {selectedTransaction.commission.totalCommission.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Provider Receives</p>
                    <p className="font-medium text-green-600">KES {selectedTransaction.commission.providerReceives.toLocaleString()}</p>
                  </div>
                  {selectedTransaction.mpesaReceiptNumber && (
                    <div>
                      <p className="text-sm text-gray-500">M-Pesa Receipt</p>
                      <p className="font-mono font-medium">{selectedTransaction.mpesaReceiptNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-medium">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedTransaction.paidAt && (
                    <div>
                      <p className="text-sm text-gray-500">Paid At</p>
                      <p className="font-medium">{new Date(selectedTransaction.paidAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedTransaction.completedAt && (
                    <div>
                      <p className="text-sm text-gray-500">Completed At</p>
                      <p className="font-medium">{new Date(selectedTransaction.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {selectedTransaction.customer && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">Customer</p>
                    <p className="font-medium">
                      {selectedTransaction.customer.firstName} {selectedTransaction.customer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedTransaction.customer.email}</p>
                  </div>
                )}

                {selectedTransaction.provider && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">Provider</p>
                    <p className="font-medium">
                      {selectedTransaction.provider.firstName} {selectedTransaction.provider.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedTransaction.provider.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryPage;