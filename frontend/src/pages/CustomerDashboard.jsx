import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { customerAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ShoppingBag,
  Home,
  Bike,
  Heart,
  Bell,
  User,
  Package,
  RefreshCw,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Layout,
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'marketplace', 'services'

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
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="card bg-red-50 border border-red-200 p-6 rounded-xl">
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Welcome Section */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border border-white/10 flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user?.name || 'Customer'}!</h2>
              <p className="text-blue-100 mt-1 text-sm">
                {user?.email} • {user?.phone}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* THREE MAIN NAVIGATION CARDS/BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Overview */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`text-left p-5 rounded-xl border transition-all shadow-sm ${
            activeTab === 'overview'
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${activeTab === 'overview' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">Dashboard Overview</h3>
              <p className="text-xs text-neutral-500 mt-1">Your stats, recent activity, and profile info</p>
            </div>
          </div>
        </button>

        {/* Card 2: Marketplace */}
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`text-left p-5 rounded-xl border transition-all shadow-sm ${
            activeTab === 'marketplace'
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${activeTab === 'marketplace' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">Marketplace</h3>
              <p className="text-xs text-neutral-500 mt-1">Products, shopping, and order tracking</p>
            </div>
          </div>
        </button>

        {/* Card 3: Services */}
        <button
          onClick={() => setActiveTab('services')}
          className={`text-left p-5 rounded-xl border transition-all shadow-sm ${
            activeTab === 'services'
              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${activeTab === 'services' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">Services</h3>
              <p className="text-xs text-neutral-500 mt-1">Property rentals, transport & healthcare</p>
            </div>
          </div>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {dashboardData?.orders || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="card bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Active Rentals</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {dashboardData?.rentals || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <div className="card bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Total Rides</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {dashboardData?.rides || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Bike className="w-6 h-6 text-yellow-600" />
              </div>
            </div>

            <div className="card bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Notifications</p>
                <p className="text-2xl font-bold text-neutral-800">
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

          {/* Recent Orders */}
          <div className="card bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-800">Recent Orders</h2>
              <Link to="/customer/orders" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {orders && orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-600 text-left">
                      <th className="py-3 px-4 font-semibold">Order ID</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Items</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                        <td className="py-3 px-4 text-neutral-800 font-mono">
                          #{order._id?.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{formatDate(order.createdAt)}</td>
                        <td className="py-3 px-4 text-neutral-600">
                          {order.items?.length || 0} item(s)
                        </td>
                        <td className="py-3 px-4 text-neutral-800 font-medium">
                          {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            to={`/customer/order/${order._id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
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
              <div className="text-center py-8 text-neutral-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>No orders yet</p>
                <Link to="/marketplace" className="text-blue-600 hover:text-blue-700 mt-2 inline-block font-medium">
                  Start Shopping
                </Link>
              </div>
            )}
          </div>

          {/* Profile Summary */}
          <div className="card bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-800">Profile Summary</h2>
              <Link to="/customer/settings" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Edit Profile
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <User className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Full Name</p>
                  <p className="font-medium text-neutral-800">{user?.name || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <Mail className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Email</p>
                  <p className="font-medium text-neutral-800">{user?.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <Phone className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Phone</p>
                  <p className="font-medium text-neutral-800">{user?.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <MapPin className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Account Type</p>
                  <p className="font-medium text-neutral-800 capitalize">{user?.role || 'Customer'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MARKETPLACE TAB */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Marketplace Stats & Highlight */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-blue-900">Your Marketplace Hub</h3>
              <p className="text-sm text-blue-700 mt-1">You have {dashboardData?.orders || 0} total marketplace orders in your activity history.</p>
            </div>
            <Link to="/marketplace" className="btn-primary px-6 py-2.5 rounded-lg shadow-sm font-semibold flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Go to Marketplace
            </Link>
          </div>

          {/* Quick Actions for Shopping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/marketplace"
              className="flex items-center gap-4 p-5 bg-white border border-neutral-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-neutral-850 group-hover:text-blue-600 transition-colors">
                  Shop Products
                </h3>
                <p className="text-sm text-neutral-500">Explore and purchase products from trusted local shops</p>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link
              to="/customer/orders"
              className="flex items-center gap-4 p-5 bg-white border border-neutral-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-neutral-850 group-hover:text-blue-600 transition-colors">
                  View Orders
                </h3>
                <p className="text-sm text-neutral-500">Track shipping, checkout status, and purchase history</p>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 transition-colors" />
            </Link>
          </div>

          {/* Product Orders List */}
          <div className="card bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-800">Your Shopping History</h2>
            </div>
            {orders && orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-600 text-left">
                      <th className="py-3 px-4 font-semibold">Order ID</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Total</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                        <td className="py-3 px-4 text-neutral-800 font-mono">
                          #{order._id?.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{formatDate(order.createdAt)}</td>
                        <td className="py-3 px-4 text-neutral-800 font-medium">
                          {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            to={`/customer/order/${order._id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Track Order
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>No shopping activity yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SERVICES TAB */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Services highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-green-50 border border-green-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-green-900 text-lg">Property Rentals</h3>
                  <p className="text-sm text-green-700 mt-1">You currently have {dashboardData?.rentals || 0} active rental booking(s).</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Home className="w-6 h-6" />
                </div>
              </div>
              <Link to="/rentals" className="inline-block mt-4 text-sm font-semibold text-green-700 hover:text-green-800 hover:underline">
                Find properties to rent →
              </Link>
            </div>

            <div className="p-5 bg-yellow-50 border border-yellow-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-yellow-900 text-lg">Bodaboda Transport</h3>
                  <p className="text-sm text-yellow-700 mt-1">You have requested {dashboardData?.rides || 0} total ride(s).</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Bike className="w-6 h-6" />
                </div>
              </div>
              <Link to="/transport" className="inline-block mt-4 text-sm font-semibold text-yellow-700 hover:text-yellow-800 hover:underline">
                Book a ride request →
              </Link>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Book Rentals */}
            <Link
              to="/rentals"
              className="flex flex-col gap-3 p-5 bg-white border border-neutral-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-850 group-hover:text-blue-600 transition-colors">Book Rentals</h4>
                <p className="text-xs text-neutral-500 mt-1">Search, rent and manage apartment spaces</p>
              </div>
            </Link>

            {/* Action 2: Bodaboda */}
            <Link
              to="/transport"
              className="flex flex-col gap-3 p-5 bg-white border border-neutral-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-850 group-hover:text-blue-600 transition-colors">Bodaboda Transport</h4>
                <p className="text-xs text-neutral-500 mt-1">Request quick local rider pickup services</p>
              </div>
            </Link>

            {/* Action 3: Healthcare */}
            <Link
              to="/healthcare"
              className="flex flex-col gap-3 p-5 bg-white border border-neutral-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-850 group-hover:text-blue-600 transition-colors">Healthcare Shop</h4>
                <p className="text-xs text-neutral-500 mt-1">Purchase medical supplies and medications</p>
              </div>
            </Link>
          </div>

          {/* Additional details list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/customer/bookings"
              className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5 text-neutral-500" />
                <span className="font-semibold text-neutral-800 text-sm">My Rental Bookings History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </Link>

            <Link
              to="/customer/rides"
              className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bike className="w-5 h-5 text-neutral-500" />
                <span className="font-semibold text-neutral-800 text-sm">My Ride History & Timeline</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
