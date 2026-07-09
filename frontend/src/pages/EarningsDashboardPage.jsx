import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, DollarSign, ShoppingBag, Home, Bike, Activity, ArrowUpCircle, Calendar } from 'lucide-react';

const EarningsDashboardPage = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchEarningsData();
    // fetchRecentTransactions(); // TODO: Endpoint doesn't exist yet
  }, [period]);

  const fetchEarningsData = async () => {
    try {
      const [statsRes, walletRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/withdrawals/earnings/stats?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/withdrawals/wallet/details`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (walletRes.data.success) {
        setWallet(walletRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching earnings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/payments/transactions?limit=5&status=completed`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setRecentTransactions(response.data.data.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      order: <ShoppingBag className="w-5 h-5" />,
      rental: <Home className="w-5 h-5" />,
      healthcare: <Activity className="w-5 h-5" />,
      ride: <Bike className="w-5 h-5" />,
    };
    return icons[type] || <DollarSign className="w-5 h-5" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      order: 'bg-blue-100 text-blue-600',
      rental: 'bg-green-100 text-green-600',
      healthcare: 'bg-red-100 text-red-600',
      ride: 'bg-yellow-100 text-yellow-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your income and performance</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  KES {stats?.totalEarnings?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Platform fees: KES {stats?.totalCommission?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.transactionCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: KES {Math.round(stats?.averageTransactionValue || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  KES {wallet?.balance?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pending: KES {wallet?.pendingBalance?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <ArrowUpCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Withdrawn</p>
                <p className="text-2xl font-bold text-gray-900">
                  KES {wallet?.totalWithdrawn?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Earnings by Type */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Earnings by Service Type</h2>
            {stats?.byType && Object.keys(stats.byType).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.byType).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(type)}`}>
                        {getTypeIcon(type)}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium capitalize">{type}</p>
                        <p className="text-sm text-gray-500">{data.count} transactions</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">KES {data.earnings.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No earnings data available for this period
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Earnings</h2>
              <Link to="/transactions" className="text-blue-600 hover:text-blue-800 text-sm">
                View All
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(transaction.type)}`}>
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium">{transaction.transactionRef}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +KES {transaction.providerReceives.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{transaction.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent transactions
              </div>
            )}
          </div>
        </div>

        {/* Daily Earnings Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Daily Earnings Trend</h2>
          {stats?.dailyEarnings && Object.keys(stats.dailyEarnings).length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-2">
              {Object.entries(stats.dailyEarnings)
                .sort(([a], [b]) => new Date(a) - new Date(b))
                .map(([date, amount]) => {
                  const maxAmount = Math.max(...Object.values(stats.dailyEarnings));
                  const height = (amount / maxAmount) * 100;
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs font-medium">
                        KES {amount > 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
                      </p>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No earnings data available for this period
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/wallet"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">Go to Wallet</p>
                <p className="text-sm text-gray-500">Manage your balance</p>
              </div>
            </div>
          </Link>

          <Link
            to="/transactions"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Transaction History</p>
                <p className="text-sm text-gray-500">View all payments</p>
              </div>
            </div>
          </Link>

          <Link
            to="/withdrawals"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <ArrowUpCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold">Withdraw Funds</p>
                <p className="text-sm text-gray-500">Transfer to M-Pesa</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboardPage;