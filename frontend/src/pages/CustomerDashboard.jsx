import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { customerAPI, notificationAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ShoppingBag,
  Home,
  Bike,
  Heart,
  Bell,
  User,
  Package,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const CustomerDashboard = () => {
  const { user, refreshProfile } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await customerAPI.getDashboardStats();
      setDashboardData(statsResponse.data?.data || {});

      // Fetch recent orders
      const ordersResponse = await customerAPI.getMyOrders({ page: 1, limit: 5 });
      setOrders(ordersResponse.data?.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await refreshProfile();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'processing':
      case 'paid':
        return 'bg-purple-100 text-purple-600';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-yellow-100 text-yellow-600';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const quickActions = [
    { title: 'Browse Marketplace', link: '/marketplace', icon: ShoppingBag, color: 'blue' },
    { title: 'Find Rentals', link: '/rentals', icon: Home, color: 'green' },
    { title: 'Book Bodaboda', link: '/transport', icon: Bike, color: 'yellow' },
    { title: 'View Orders', link: '/customer/orders', icon: Package, color: 'purple' },
  ];

  const serviceCards = [
    { title: 'Shop', description: 'Browse products from local businesses', link: '/marketplace', icon: ShoppingBag, color: 'blue' },
    { title: 'Book Rentals', description: 'Find your perfect home', link: '/rentals', icon: Home, color: 'green' },
    { title: 'Health Care', description: 'Order medicines and health products', link: '/healthcare', icon: Heart, color: 'red' },
    { title: 'Bodaboda Services', description: 'Fast motorcycle transport', link: '/transport', icon: Bike, color: 'yellow' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user?.name || 'Customer'}!</h2>
              <p className="text-primary-100 mt-1">
                {user?.email} • {user?.phone}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-secondary-800">
                {dashboardData?.orders || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Active Rentals</p>
              <p className="text-2xl font-bold text-secondary-800">
                {dashboardData?.rentals || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Total Rides</p>
              <p className="text-2xl font-bold text-secondary-800">
                {dashboardData?.rides || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Bike className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Notifications</p>
              <p className="text-2xl font-bold text-secondary-800">
                {unreadCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center relative">
              <Bell className="w-6 h-6 text-red-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Home Services */}
      <div className="card">
        <h2 className="text-xl font-bold text-secondary-800 mb-4">Home Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceCards.map((service) => (
            <Link
              key={service.title}
              to={service.link}
              className="flex items-center gap-4 p-4 bg-secondary-50 rounded-lg hover:bg-primary-50 hover:shadow-md transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${service.color === 'blue' ? 'bg-blue-100' :
                service.color === 'green' ? 'bg-green-100' :
                  service.color === 'red' ? 'bg-red-100' :
                    'bg-yellow-100'
                }`}>
                <service.icon className={`w-6 h-6 ${service.color === 'blue' ? 'text-blue-600' :
                  service.color === 'green' ? 'text-green-600' :
                    service.color === 'red' ? 'text-red-600' :
                      'text-yellow-600'
                  }`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-secondary-800 group-hover:text-primary-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-secondary-500">{service.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.link}
              className="flex flex-col items-center gap-3 p-4 bg-secondary-50 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <action.icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-center">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary-800">Recent Orders</h2>
          <Link to="/customer/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Order</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-4 text-secondary-800">
                      #{order._id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-secondary-600">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4 text-secondary-600">
                      {order.items?.length || 0} item(s)
                    </td>
                    <td className="py-3 px-4 text-secondary-800 font-medium">
                      {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/customer/order/${order._id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-secondary-300" />
            <p>No orders yet</p>
            <Link to="/marketplace" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
              Start Shopping
            </Link>
          </div>
        )}
      </div>

      {/* Profile Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary-800">Profile Summary</h2>
          <Link to="/customer/settings" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Edit Profile
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
            <User className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-500">Full Name</p>
              <p className="font-medium text-secondary-800">{user?.name || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
            <Mail className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-500">Email</p>
              <p className="font-medium text-secondary-800">{user?.email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
            <Phone className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-500">Phone</p>
              <p className="font-medium text-secondary-800">{user?.phone || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
            <MapPin className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm text-secondary-500">Account Type</p>
              <p className="font-medium text-secondary-800 capitalize">{user?.role || 'Customer'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;