import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLandlordDashboard } from '../hooks/useDashboardData';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useSocket } from '../context/SocketContext';
import api, { rentalAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import { Check, X, Clock, MessageSquare, Calendar, Home, ArrowRight, User } from 'lucide-react';

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
  const [activeBookings, setActiveBookings] = useState([]);
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

  // Fetch all active bookings
  const fetchActiveBookings = async () => {
    try {
      setBookingsLoading(true);
      const response = await api.get('/landlord/bookings');
      const allB = response.data.data || [];
      // Filter active statuses (pending, confirmed, out_for_handover, active)
      const filtered = allB.filter(b => ['pending', 'confirmed', 'out_for_handover', 'active'].includes(b.status));
      // Sort priority: pending > confirmed > out_for_handover > active
      const priority = { 'pending': 1, 'confirmed': 2, 'out_for_handover': 3, 'active': 4 };
      filtered.sort((a, b) => (priority[a.status] || 9) - (priority[b.status] || 9));

      setActiveBookings(filtered);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  // Listen for socket events to update Landlord dashboard automatically
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('[LandlordDashboard] Real-time event received, refetching landlord stats and bookings...');
      refetch();
      fetchActiveBookings();
    };

    socket.on('new_booking', handleUpdate);
    socket.on('booking_accepted', handleUpdate);
    socket.on('booking_declined', handleUpdate);
    socket.on('move_in_confirmed', handleUpdate);
    socket.on('new_notification', handleUpdate);

    return () => {
      socket.off('new_booking', handleUpdate);
      socket.off('booking_accepted', handleUpdate);
      socket.off('booking_declined', handleUpdate);
      socket.off('move_in_confirmed', handleUpdate);
      socket.off('new_notification', handleUpdate);
    };
  }, [socket, refetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await fetchActiveBookings();
    setRefreshing(false);
  };

  const handleAcceptBooking = async (booking) => {
    try {
      setProcessing(true);
      await api.put(`/rentals/${booking.rentalId}/bookings/${booking.bookingId}/status`, {
        status: 'confirmed',
        paymentStatus: 'paid'
      });
      toastSuccess('Booking accepted successfully');
      fetchActiveBookings();
      refetch();
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
      await api.put(`/rentals/${selectedBooking.rentalId}/bookings/${selectedBooking.bookingId}/status`, {
        status: 'cancelled',
        declineReason
      });
      toastSuccess('Booking declined successfully');
      setDeclineModalOpen(false);
      setSelectedBooking(null);
      setDeclineReason('');
      fetchActiveBookings();
      refetch();
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
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 font-bold text-sm shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* FEATURE 1: ACTIVE TASKS AT THE TOP OF EVERY DASHBOARD (Landlord Dashboard) */}
      {activeBookings.length > 0 && (
        <div className="bg-orange-50/40 p-5 rounded-2xl border border-orange-100 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
            <h2 className="text-lg font-extrabold text-neutral-900 uppercase tracking-wide">
              Active Rental Bookings ({activeBookings.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBookings.map((booking) => {
              const bookingId = booking.bookingId;
              const status = booking.status;
              return (
                <div key={bookingId} className="bg-white border-2 border-emerald-150 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase rounded-md border border-emerald-100">
                        <Home className="w-3 h-3" />
                        {status === 'pending' ? 'Booking Request' : 'Active Tenancy'}
                      </span>
                      <span className="text-[10px] font-black uppercase text-secondary-400">
                        #{bookingId?.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-secondary-800 text-sm line-clamp-1">{booking.rentalName}</h3>
                    <p className="text-xs text-secondary-500 capitalize">{booking.rentalType?.replace('-', ' ')} • {booking.location}</p>

                    <div className="mt-2.5 space-y-1 bg-neutral-50 p-2 rounded-lg border border-neutral-100 text-xs">
                      <p><span className="font-bold">Tenant:</span> {booking.customer?.name || 'Guest'}</p>
                      <p><span className="font-bold">Rent:</span> KSh {booking.monthlyPrice?.toLocaleString()}</p>
                      <p>
                        <span className="font-bold">Status:</span>
                        <span className="inline-block ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold uppercase rounded text-[9px]">
                          {status}
                        </span>
                      </p>
                    </div>

                    {status === 'pending' && (
                      <p className="text-[11px] text-amber-600 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-100 mt-2">
                        Awaiting landlord approval to secure reservation
                      </p>
                    )}
                    {status === 'confirmed' && (
                      <p className="text-[11px] text-blue-600 font-bold bg-blue-50 p-1.5 rounded-lg border border-blue-100 mt-2">
                        Tenant awaiting move-in/check-in confirmation
                      </p>
                    )}
                    {status === 'active' && (
                      <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 mt-2">
                        Active Tenancy
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2 flex-wrap">
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAcceptBooking(booking)}
                          disabled={processing}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-lg shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeclineClick(booking)}
                          disabled={processing}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {status === 'confirmed' && (
                      <button
                        onClick={() => navigate('/landlord/bookings')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <Calendar size={12} />
                        Manage Handover
                      </button>
                    )}

                    {booking.customer?.phone && (
                      <a
                        href={`tel:${booking.customer.phone}`}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-lg flex items-center gap-1 self-center"
                      >
                        <MessageSquare size={12} />
                        Call Tenant
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Properties"
          value={stats?.totalProperties || 0}
          subtitle={`${stats?.vacantProperties || 0} vacant / ${stats?.bookedRooms || 0} booked`}
          color="primary"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          }
        />

        <StatCard
          title="Active Tenants"
          value={stats?.activeTenants || 0}
          subtitle="Currently active bookings"
          color="info"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          title="Monthly Earnings"
          value={`KES ${stats?.monthlyEarnings?.toLocaleString() || 0}`}
          subtitle="This month's rental earnings"
          color="purple"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Total Earnings"
          value={`KES ${stats?.totalEarnings?.toLocaleString() || 0}`}
          subtitle="All-time completed earnings"
          color="success"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Reviews, Rating, Views & Occupancy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Rating"
          value={`${stats?.rating || 0} / 5.0`}
          subtitle="Landlord rating"
          color="warning"
          icon={
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
        />

        <StatCard
          title="Reviews"
          value={stats?.reviewsCount || 0}
          subtitle="Total guest reviews"
          color="info"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />

        <StatCard
          title="Views"
          value={stats?.totalViews || 0}
          subtitle={`Avg ${stats?.averageViews || 0} views / property`}
          color="primary"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />

        <StatCard
          title="Occupancy"
          value={`${stats?.occupancyRate || 0}%`}
          subtitle={`Vacancy: ${100 - (stats?.occupancyRate || 0)}%`}
          color="success"
          icon={
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm"
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