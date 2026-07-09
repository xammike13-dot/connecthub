import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBusinessDashboard } from '../hooks/useDashboardData';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import api from '../services/api';

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
    primary: 'bg-gradient-to-br from-blue-500 to-blue-600',
    success: 'bg-gradient-to-br from-green-500 to-green-600',
    warning: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    danger: 'bg-gradient-to-br from-red-500 to-red-600',
    info: 'bg-gradient-to-br from-purple-500 to-purple-600',
  };

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-secondary-800">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-secondary-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-14 h-14 rounded-xl ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const BusinessDashboard = () => {
  const { stats, orders, loading, error, refetch } = useBusinessDashboard();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const location = useLocation();

  // Check if walkthrough should be shown
  useEffect(() => {
    if (location.state?.showWalkthrough && !user?.onboardingCompleted) {
      setShowWalkthrough(true);
    }
  }, [location.state, user]);

  const walkthroughSteps = [
    {
      targetId: 'add-product-btn',
      title: 'Add Your First Product',
      content: 'Click here to list your first product on the marketplace.',
    },
    {
      targetId: 'upload-image-btn',
      title: 'Upload Product Image',
      content: 'Add high-quality images to attract more customers.',
    },
    {
      targetId: 'set-price-btn',
      title: 'Set Product Price',
      content: 'Configure competitive pricing for your product.',
    },
    {
      targetId: 'publish-btn',
      title: 'Publish Product',
      content: 'Make your product visible to potential buyers.',
    },
  ];

  const handleWalkthroughComplete = async () => {
    setShowWalkthrough(false);
    try {
      await api.post('/setup/onboarding-complete');
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
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
      <div className="card bg-red-50 border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">
            Welcome back, {user?.name?.split(' ')[0] || 'Business Owner'}!
          </h1>
          <p className="text-secondary-500 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Product Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          subtitle="All products"
          color="primary"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />

        <StatCard
          title="Active Products"
          value={stats?.activeProducts || 0}
          subtitle="In stock and available"
          color="success"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockProducts || 0}
          subtitle="Need restocking"
          color="warning"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          subtitle="All time orders"
          color="info"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders || 0}
          subtitle="Awaiting processing"
          color="warning"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Completed Orders"
          value={stats?.completedOrders || 0}
          subtitle="Successfully delivered"
          color="success"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />

        <StatCard
          title="Cancelled Orders"
          value={stats?.cancelledOrders || 0}
          subtitle="Order cancellations"
          color="danger"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14L21 3m0 0l-11 0m11 0l0 11" />
            </svg>
          }
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Available Balance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(stats?.availableBalance || 0)}
              </p>
              <p className="text-sm text-secondary-500 mt-1">Ready to withdraw</p>
            </div>
            <button
              onClick={() => window.location.href = '/business/wallet'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Withdraw
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Pending Balance</h3>
          <div>
            <p className="text-3xl font-bold text-yellow-600">
              {formatCurrency(stats?.pendingBalance || 0)}
            </p>
            <p className="text-sm text-secondary-500 mt-1">Awaiting completion</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Total Revenue</h3>
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(stats?.totalRevenue || 0)}
            </p>
            <p className="text-sm text-secondary-500 mt-1">From completed orders</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Total Earnings</h3>
          <div>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(stats?.totalEarnings || 0)}
            </p>
            <p className="text-sm text-secondary-500 mt-1">All time earnings</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/business/products"
            className="p-4 rounded-lg border border-secondary-200 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800">Add Product</h3>
              <p className="text-sm text-secondary-500">List new item</p>
            </div>
          </Link>

          <Link
            to="/business/orders"
            className="p-4 rounded-lg border border-secondary-200 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800">Manage Orders</h3>
              <p className="text-sm text-secondary-500">View and process</p>
            </div>
          </Link>

          <Link
            to="/business/wallet"
            className="p-4 rounded-lg border border-secondary-200 hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800">Wallet</h3>
              <p className="text-sm text-secondary-500">Manage earnings</p>
            </div>
          </Link>

          <Link
            to="/business/notifications"
            className="p-4 rounded-lg border border-secondary-200 hover:border-yellow-500 hover:bg-yellow-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800">Notifications</h3>
              <p className="text-sm text-secondary-500">View alerts</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-secondary-800">Recent Orders</h2>
          <Link to="/business/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all
          </Link>
        </div>
        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-4 text-secondary-800">
                      {order.customer?.name || 'Customer'}
                    </td>
                    <td className="py-3 px-4 text-secondary-600">{order.items?.length || 0} items</td>
                    <td className="py-3 px-4 text-secondary-800 font-medium">
                      {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No orders yet</p>
          </div>
        )}
      </div>

      {/* Guided Walkthrough */}
      {showWalkthrough && (
        <GuidedWalkthrough
          steps={walkthroughSteps}
          onComplete={handleWalkthroughComplete}
          onSkip={handleWalkthroughComplete}
        />
      )}
    </div>
  );
};

export default BusinessDashboard;