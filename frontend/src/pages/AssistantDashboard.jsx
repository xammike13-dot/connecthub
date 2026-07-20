import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api, { orderAPI, assistantAPI, businessAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/Toast';
import {
  Package,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Clock,
  XCircle,
  Bell,
  ArrowRight,
  RefreshCw,
  Star,
  Check,
  X,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50 border-blue-100',
    success: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50 border-emerald-100',
    warning: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50 border-amber-100',
    danger: 'from-rose-500 to-rose-600 text-rose-600 bg-rose-50 border-rose-100',
    info: 'from-indigo-500 to-indigo-600 text-indigo-600 bg-indigo-50 border-indigo-100',
  };

  const iconBgClasses = {
    primary: 'bg-blue-100',
    success: 'bg-emerald-100',
    warning: 'bg-amber-100',
    danger: 'bg-rose-100',
    info: 'bg-indigo-100',
  };

  return (
    <div className={`card p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between overflow-hidden relative group`}>
      <div className="space-y-1.5 z-10">
        <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-extrabold text-secondary-800 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-secondary-500 font-medium">{subtitle}</p>}
      </div>
      <div className={`w-12.5 h-12.5 rounded-xl ${iconBgClasses[color]} ${colorClasses[color].split(' ')[0]} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-200 z-10`}>
        {icon}
      </div>
    </div>
  );
};

const AssistantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionProcessing, setActionProcessing] = useState({});
  const { socket } = useSocket();

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, ordersRes] = await Promise.all([
        assistantAPI.getDashboardStats(),
        businessAPI.getOrders({ page: 1, limit: 10 }),
      ]);
      setStats(statsRes.data.data);
      setOrders(ordersRes.data.data || []);
    } catch (err) {
      console.error('Error loading assistant dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('[AssistantDashboard] Real-time socket event, refreshing stats...');
      fetchDashboardData();
    };

    socket.on('order_created', handleUpdate);
    socket.on('order_completed', handleUpdate);
    socket.on('order_cancelled', handleUpdate);
    socket.on('order_delivered', handleUpdate);
    socket.on('payment_confirmed', handleUpdate);
    socket.on('new_order', handleUpdate);
    socket.on('new_notification', handleUpdate);

    return () => {
      socket.off('order_created', handleUpdate);
      socket.off('order_completed', handleUpdate);
      socket.off('order_cancelled', handleUpdate);
      socket.off('order_delivered', handleUpdate);
      socket.off('payment_confirmed', handleUpdate);
      socket.off('new_order', handleUpdate);
      socket.off('new_notification', handleUpdate);
    };
  }, [socket, fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (orderId) => {
    setActionProcessing(prev => ({ ...prev, [orderId]: true }));
    try {
      await orderAPI.accept(orderId, '30 mins');
      toastSuccess('Order accepted successfully!');
      fetchDashboardData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setActionProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRejectOrder = async (orderId) => {
    setActionProcessing(prev => ({ ...prev, [orderId]: true }));
    try {
      await orderAPI.businessCancel(orderId, 'Out of stock');
      toastSuccess('Order rejected/cancelled successfully');
      fetchDashboardData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setActionProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setActionProcessing(prev => ({ ...prev, [orderId]: true }));
    try {
      await orderAPI.markDelivered(orderId);
      toastSuccess('Order marked as delivered successfully!');
      fetchDashboardData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to mark delivered');
    } finally {
      setActionProcessing(prev => ({ ...prev, [orderId]: false }));
    }
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
      <div className="card bg-red-50 border border-red-200 p-6 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-red-800">Error Loading Dashboard</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-sm"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'processing':
      case 'paid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
      case 'refunded':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const formatStatus = (status) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Filter Active orders for tasks (pending, paid, processing, delivered)
  const activeOrders = orders.filter(o => ['pending', 'paid', 'processing', 'delivered'].includes(o.status));

  // Sort active tasks: pending (highest action required) > paid > processing > delivered
  const sortedActiveOrders = [...activeOrders].sort((a, b) => {
    const priority = { 'pending': 1, 'paid': 2, 'processing': 3, 'delivered': 4 };
    return (priority[a.status] || 9) - (priority[b.status] || 9);
  });

  return (
    <div className="space-y-6">
      {/* Welcome sub-header inside main body */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 border border-secondary-100 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-secondary-800 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Assistant'}!
          </h2>
          <p className="text-sm text-secondary-500 mt-1 font-medium">
            Manage your business operations, products, and process orders efficiently.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition-all duration-150 font-semibold shadow-sm text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      {/* ACTIVE TASKS AT THE TOP (Orders requiring Action) */}
      {sortedActiveOrders.length > 0 && (
        <div className="bg-orange-50/40 p-5 rounded-2xl border border-orange-100 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
            <h2 className="text-lg font-extrabold text-neutral-900 uppercase tracking-wide">
              Active Orders Requiring Action ({sortedActiveOrders.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedActiveOrders.map(order => {
              const isProcessing = actionProcessing[order._id];
              return (
                <div key={order._id} className="bg-white border-2 border-blue-150 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-md border border-blue-100">
                        Order #{order._id?.slice(-6).toUpperCase()}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadgeClass(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>

                    <p className="text-sm font-extrabold text-secondary-800">
                      Customer: {order.customer?.name || 'Customer'}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">
                      {order.items?.length || 0} Items • {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                    </p>

                    {/* Specific Sub-status/workflow displays */}
                    {order.status === 'pending' && (
                      <p className="text-xs text-amber-600 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-100 mt-2">
                        Waiting for assistant confirmation
                      </p>
                    )}
                    {order.status === 'paid' && (
                      <p className="text-xs text-blue-600 font-bold bg-blue-50 p-1.5 rounded-lg border border-blue-100 mt-2">
                        Payment Paid • Prepared/Packed
                      </p>
                    )}
                    {order.status === 'processing' && (
                      <p className="text-xs text-purple-600 font-bold bg-purple-50 p-1.5 rounded-lg border border-purple-100 mt-2">
                        Packed & Ready for delivery
                      </p>
                    )}
                    {order.status === 'delivered' && (
                      <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 mt-2">
                        Awaiting Customer Release (Escrow held)
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAcceptOrder(order._id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1"
                        >
                          <Check size={12} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectOrder(order._id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-lg flex items-center gap-1"
                        >
                          <X size={12} />
                          Decline
                        </button>
                      </>
                    )}

                    {(order.status === 'paid' || order.status === 'processing') && (
                      <button
                        onClick={() => handleMarkDelivered(order._id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <CheckCircle size={12} />
                        Mark Delivered
                      </button>
                    )}

                    <Link
                      to="/assistant/orders"
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-lg self-center ml-auto"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          subtitle="All inventory listings"
          color="primary"
          icon={<Package className="w-6 h-6" />}
        />

        <StatCard
          title="Active Products"
          value={stats?.activeProducts || 0}
          subtitle="Published and available"
          color="success"
          icon={<CheckCircle className="w-6 h-6" />}
        />

        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockProducts || 0}
          subtitle="Restocking required"
          color="danger"
          icon={<AlertCircle className="w-6 h-6" />}
        />

        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          subtitle="All-time client orders"
          color="info"
          icon={<ShoppingCart className="w-6 h-6" />}
        />

        <StatCard
          title="Business Rating"
          value={stats?.rating !== undefined ? `${stats.rating.toFixed(1)} / 5.0` : '0.0 / 5.0'}
          subtitle="Customer feedback score"
          color="warning"
          icon={<Star className="w-6 h-6 fill-amber-400 text-amber-500" />}
        />
      </div>

      {/* Order Status Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders || 0}
          subtitle="Awaiting preparation"
          color="warning"
          icon={<Clock className="w-6 h-6" />}
        />

        <StatCard
          title="Completed Orders"
          value={stats?.completedOrders || 0}
          subtitle="Delivered successfully"
          color="success"
          icon={<CheckCircle className="w-6 h-6" />}
        />

        <StatCard
          title="Cancelled Orders"
          value={stats?.cancelledOrders || 0}
          subtitle="Refunds and cancellations"
          color="danger"
          icon={<XCircle className="w-6 h-6" />}
        />
      </div>

      {/* Quick Actions (Strictly non-financial only) */}
      <div className="card p-6 bg-white border border-secondary-100 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-secondary-800 tracking-tight mb-4">Operational Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/assistant/products"
            className="p-4 rounded-xl border border-secondary-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-150 flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors shadow-sm">
              <Package size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-secondary-800">Add & Edit Products</h3>
              <p className="text-xs text-secondary-400 font-semibold mt-0.5">Manage catalog</p>
            </div>
          </Link>

          <Link
            to="/assistant/orders"
            className="p-4 rounded-xl border border-secondary-100 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-150 flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-sm">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-secondary-800">Process Orders</h3>
              <p className="text-xs text-secondary-400 font-semibold mt-0.5">View and update</p>
            </div>
          </Link>

          <Link
            to="/assistant/notifications"
            className="p-4 rounded-xl border border-secondary-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-150 flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors shadow-sm">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-secondary-800">Notifications</h3>
              <p className="text-xs text-secondary-400 font-semibold mt-0.5">View inbox alerts</p>
            </div>
          </Link>

          <Link
            to="/assistant/help"
            className="p-4 rounded-xl border border-secondary-100 hover:border-amber-500 hover:bg-amber-50/50 transition-all duration-150 flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors shadow-sm">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-secondary-800">Help Center</h3>
              <p className="text-xs text-secondary-400 font-semibold mt-0.5">Support coordinates</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card p-6 bg-white border border-secondary-100 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-lg font-bold text-secondary-800 tracking-tight">Recent Business Orders</h2>
          <Link to="/assistant/orders" className="text-primary-600 hover:text-primary-700 text-xs font-bold flex items-center gap-1 transition-colors">
            View All Orders
            <ArrowRight size={14} />
          </Link>
        </div>

        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-secondary-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary-50/80 border-b border-secondary-100">
                  <th className="py-3 px-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Items count</th>
                  <th className="py-3 px-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order._id} className="hover:bg-secondary-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-sm text-secondary-800">
                      {order.customer?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-secondary-600">
                      {order.items?.length || 0} items
                    </td>
                    <td className="py-3.5 px-4 text-sm font-bold text-secondary-800 text-right">
                      {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-secondary-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-secondary-200" />
            <p className="text-sm font-medium">No order files found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantDashboard;
