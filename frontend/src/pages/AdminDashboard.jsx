import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Package, 
  Home, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  Activity,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userPagination, setUserPagination] = useState({ total: 0, pages: 0, currentPage: 1 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await adminAPI.getDashboardStats();
      setStats(statsResponse.data.data);
      
      // Fetch users
      const usersResponse = await adminAPI.getUsers({ limit: 10 });
      setUsers(usersResponse.data.data || []);
      setUserPagination(usersResponse.data.pagination || { total: 0, pages: 0, currentPage: 1 });
      
      // Fetch withdrawals
      const withdrawalsResponse = await adminAPI.getWithdrawals({ limit: 10 });
      setWithdrawals(withdrawalsResponse.data.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdrawal = async (id) => {
    try {
      await adminAPI.approveWithdrawal(id);
      setWithdrawals(withdrawals.map(w => 
        w._id === id ? { ...w, status: 'approved' } : w
      ));
      setShowWithdrawalModal(false);
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
    }
  };

  const handleRejectWithdrawal = async (id, reason = 'Invalid details') => {
    try {
      await adminAPI.rejectWithdrawal(id, reason);
      setWithdrawals(withdrawals.map(w => 
        w._id === id ? { ...w, status: 'rejected' } : w
      ));
      setShowWithdrawalModal(false);
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'withdrawals', label: 'Withdrawals' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage your platform from here</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
                  <Package size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts || 0}</p>
              <p className="text-xs text-gray-500">Products</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                  <Home size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRentals || 0}</p>
              <p className="text-xs text-gray-500">Rentals</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                  <ShoppingCart size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue || 0)}</p>
              <p className="text-xs text-gray-500">Revenue</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <CreditCard size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions || 0}</p>
              <p className="text-xs text-gray-500">Transactions</p>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex overflow-x-auto border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search size={18} />}
                    className="max-w-xs"
                  />
                  <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                    Refresh
                  </Button>
                </div>
                {users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Joined</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">{user.name}</td>
                            <td className="py-3 px-4">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                user.role === 'customer' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'business' ? 'bg-green-100 text-green-700' :
                                user.role === 'rider' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="ghost" size="sm">
                                <Eye size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No users found</div>
                )}
              </div>
            )}

            {/* Withdrawals Tab */}
            {activeTab === 'withdrawals' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Withdrawal Requests</h3>
                  <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                    Refresh
                  </Button>
                </div>
                {withdrawals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((withdrawal) => {
                          const statusConfig = {
                            pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
                            approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
                            rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
                          };
                          const status = statusConfig[withdrawal.status] || statusConfig.pending;
                          const StatusIcon = status.icon;

                          return (
                            <tr key={withdrawal._id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">{withdrawal.user?.name || 'User'}</td>
                              <td className="py-3 px-4 font-medium">{formatCurrency(withdrawal.amount || 0)}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${status.color}`}>
                                  <StatusIcon size={12} />
                                  {withdrawal.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500">
                                {new Date(withdrawal.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                {withdrawal.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleApproveWithdrawal(withdrawal._id)}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleRejectWithdrawal(withdrawal._id)}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No withdrawal requests</div>
                )}
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Revenue Trend
                  </h3>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Activity size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Chart integration coming soon</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity size={20} />
                    User Activity
                  </h3>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Users size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Chart integration coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;