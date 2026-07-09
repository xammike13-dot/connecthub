import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLandlordDashboard } from '../hooks/useDashboardData';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import GuidedWalkthrough from '../components/GuidedWalkthrough';

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600',
    success: 'bg-gradient-to-br from-green-500 to-green-600',
    warning: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    danger: 'bg-gradient-to-br from-red-500 to-red-600',
    info: 'bg-gradient-to-br from-blue-500 to-blue-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
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

const LandlordDashboard = () => {
  const { stats, loading, error, refetch } = useLandlordDashboard();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [newBookings, setNewBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if walkthrough should be shown
  useEffect(() => {
    if (location.state?.showWalkthrough && !user?.onboardingCompleted) {
      setShowWalkthrough(true);
    }
  }, [location.state, user]);

  const walkthroughSteps = [
    {
      targetId: 'add-property-btn',
      title: 'Add Your First Property',
      content: 'Click here to list your first rental property and start earning.',
    },
    {
      targetId: 'upload-photos-btn',
      title: 'Upload Property Photos',
      content: 'Add high-quality photos to attract more tenants.',
    },
    {
      targetId: 'set-price-btn',
      title: 'Set Rental Price',
      content: 'Configure competitive pricing for your property.',
    },
    {
      targetId: 'publish-btn',
      title: 'Publish Your Listing',
      content: 'Make your property visible to potential tenants.',
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

  // Fetch new bookings
  useEffect(() => {
    const fetchNewBookings = async () => {
      try {
        setBookingsLoading(true);
        const response = await api.get('/landlord/new-bookings');
        setNewBookings(response.data.data || []);
        console.log('[NEW BOOKINGS]', response.data.data);
      } catch (err) {
        console.error('Failed to fetch new bookings:', err);
      } finally {
        setBookingsLoading(false);
      }
    };

    fetchNewBookings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    // Also refresh bookings
    const response = await api.get('/landlord/new-bookings');
    setNewBookings(response.data.data || []);
    setRefreshing(false);
  };

  const handleAcceptBooking = async (booking) => {
    try {
      setProcessing(true);
      console.log('[ACCEPT BOOKING]', booking);
      await api.put(`/rentals/${booking.rentalId}/bookings/${booking.bookingId}/status`, {
        status: 'confirmed',
        paymentStatus: 'paid'
      });
      toastSuccess('Booking accepted successfully');
      // Refresh bookings
      const response = await api.get('/landlord/new-bookings');
      setNewBookings(response.data.data || []);
    } catch (error) {
      console.error('[ACCEPT BOOKING ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to accept booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineClick = (booking) => {
    setSelectedBooking(booking);
    setDeclineReason('');
    setDeclineModalOpen(true);
  };

  const handleDeclineConfirm = async () => {
    if (!declineReason.trim()) {
      toastError('Please provide a reason for declining');
      return;
    }

    try {
      setProcessing(true);
      console.log('[DECLINE BOOKING]', selectedBooking, 'Reason:', declineReason);
      await api.put(`/rentals/${selectedBooking.rentalId}/bookings/${selectedBooking.bookingId}/status`, {
        status: 'cancelled',
        declineReason
      });
      toastSuccess('Booking declined successfully');
      setDeclineModalOpen(false);
      setSelectedBooking(null);
      setDeclineReason('');
      // Refresh bookings
      const response = await api.get('/landlord/new-bookings');
      setNewBookings(response.data.data || []);
    } catch (error) {
      console.error('[DECLINE BOOKING ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to decline booking');
    } finally {
      setProcessing(false);
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
      <div className="card bg-red-50 border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Error Loading Dashboard
            </h3>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">
            Welcome back, {user?.name?.split(' ')[0] || 'Landlord'}!
          </h1>
          <p className="text-secondary-500 mt-1">
            Here's what's happening with your properties today.
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value={stats?.totalProperties || 0}
          subtitle="All your listings"
          color="primary"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          }
        />

        <StatCard
          title="Vacant Rooms"
          value={stats?.vacantProperties || 0}
          subtitle="Available for booking"
          color="success"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Booked Rooms"
          value={stats?.bookedRooms || 0}
          subtitle="Currently occupied"
          color="info"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          title="Monthly Earnings"
          value={`KES ${stats?.totalEarnings?.toLocaleString() || 0}`}
          subtitle="This month's rental earnings"
          color="purple"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Available Balance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">
                KES {stats?.availableBalance?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-secondary-500 mt-1">Ready to withdraw</p>
            </div>
            <button
              onClick={() => navigate('/landlord/wallet')}
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
              KES {stats?.pendingBalance?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-secondary-500 mt-1">Awaiting completion</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Pending Earnings</h3>
          <div>
            <p className="text-3xl font-bold text-blue-600">
              KES {stats?.pendingEarnings?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-secondary-500 mt-1">From recent bookings</p>
          </div>
        </div>
      </div>

      {/* New Bookings Section */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">
          New Bookings
        </h2>
        {bookingsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : newBookings.length === 0 ? (
          <div className="text-center py-8 text-secondary-500">
            <p>No new bookings</p>
          </div>
        ) : (
          <div className="space-y-4">
            {newBookings.map((booking) => (
              <div key={booking.bookingId} className="border border-secondary-200 rounded-lg p-4 hover:border-primary-500 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-secondary-800">{booking.rentalName}</h3>
                    <p className="text-sm text-secondary-500 capitalize">{booking.rentalType?.replace('-', ' ')}</p>
                    <p className="text-sm text-secondary-600 mt-1">{booking.location}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Customer:</span> {booking.customer?.name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {booking.customer?.phone}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Monthly Rent:</span> KSh {booking.monthlyPrice?.toLocaleString()}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Status:</span>
                        <span className="inline-block ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          {booking.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptBooking(booking)}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Accept Booking
                    </button>
                    <button
                      onClick={() => handleDeclineClick(booking)}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Decline Booking
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property Performance */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">
          Property Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-secondary-500 mb-1">Total Views</p>
            <p className="text-2xl font-bold text-purple-600">{stats?.totalViews || 0}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-500 mb-1">Avg Views/Property</p>
            <p className="text-2xl font-bold text-primary-600">{stats?.averageViews || 0}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-500 mb-1">Occupancy Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.totalProperties > 0
                ? Math.round((stats?.bookedRooms / stats?.totalProperties) * 100)
                : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-500 mb-1">Vacancy Rate</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats?.totalProperties > 0
                ? Math.round((stats?.vacantProperties / stats?.totalProperties) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/landlord/properties"
            className="p-4 rounded-lg border border-secondary-200 hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800">Manage Properties</h3>
              <p className="text-sm text-secondary-500">View and edit listings</p>
            </div>
          </Link>

          <Link
            to="/landlord/properties/new"
            className="p-4 rounded-lg border border-secondary-200 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-secondary-800">Add Property</h3>
              <p className="text-sm text-secondary-500">Create new listing</p>
            </div>
          </Link>

          <Link
            to="/landlord/wallet"
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
            to="/landlord/notifications"
            className="p-4 rounded-lg border border-secondary-200 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Decline Booking Modal */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => {
          setDeclineModalOpen(false);
          setSelectedBooking(null);
          setDeclineReason('');
        }}
        title="Decline Booking"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Reason for declining booking:
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Property no longer available, Double booking, Maintenance in progress..."
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={() => {
                setDeclineModalOpen(false);
                setSelectedBooking(null);
                setDeclineReason('');
              }}
              disabled={processing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeclineConfirm}
              disabled={processing || !declineReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Decline Booking'}
            </button>
          </div>
        </div>
      </Modal>

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

export default LandlordDashboard;