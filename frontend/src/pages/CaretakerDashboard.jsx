import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiClient';
import {
  Building2, Users, Calendar, AlertTriangle, Bell,
  ArrowRight, Phone, Mail, Check, X, Loader2, BookmarkCheck, ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';

const CaretakerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/caretakers/dashboard/stats');
      setStats(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBookingAction = async (rentalId, bookingId, action) => {
    setProcessingId(bookingId);
    try {
      const payload = { status: action === 'accept' ? 'confirmed' : 'cancelled' };
      if (action === 'reject') {
        payload.declineReason = 'Declined by caretaker.';
      }
      await api.put(`/rentals/${rentalId}/bookings/${bookingId}/status`, payload);
      // Refresh stats
      await fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update booking status.');
    } finally {
      setProcessingId('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-neutral-500 font-medium mt-3">Loading Caretaker Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl">
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Caretaker Control Panel</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage properties, occupancy, and guest check-ins efficiently.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => navigate('/caretaker/properties/new')}>
            + Add Property
          </Button>
          <Button variant="outline" onClick={() => navigate('/caretaker/bookings')}>
            Manage Bookings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Properties */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">My Properties</span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1">{stats?.totalProperties || 0}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Occupied Properties */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Occupied Units</span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1">{stats?.occupiedProperties || 0}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Vacant Properties */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Vacant Units</span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1">{stats?.vacantProperties || 0}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Occupancy Rate</span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1">{stats?.occupancyRate || 0}%</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <BookmarkCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Booking Requests & Rent Reminders */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Bookings / Pending Approvals */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-neutral-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Booking Approval Requests ({stats?.newBookingsCount || 0})
              </h2>
              <button
                onClick={() => navigate('/caretaker/bookings')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 divide-y divide-neutral-100">
              {stats?.newBookings?.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  No pending booking requests.
                </div>
              ) : (
                stats?.newBookings?.map((booking) => (
                  <div key={booking.bookingId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-neutral-900">{booking.rentalName}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5 capitalize">{booking.location} • KSh {booking.totalPrice?.toLocaleString()}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-lg w-fit">
                        <Users className="w-3.5 h-3.5" />
                        <span>{booking.customer?.name} • {booking.customer?.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <button
                        disabled={processingId === booking.bookingId}
                        onClick={() => handleBookingAction(booking.rentalId, booking.bookingId, 'accept')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        disabled={processingId === booking.bookingId}
                        onClick={() => handleBookingAction(booking.rentalId, booking.bookingId, 'reject')}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rent Reminders */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Rent Due Reminders ({stats?.rentDueReminders?.length || 0})
              </h2>
            </div>

            <div className="p-5 divide-y divide-neutral-100">
              {stats?.rentDueReminders?.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  All rent payments are up to date!
                </div>
              ) : (
                stats?.rentDueReminders?.map((reminder) => (
                  <div key={reminder.bookingId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <h4 className="font-bold text-neutral-900">Tenant: {reminder.tenant?.name}</h4>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Rent of <span className="font-bold text-neutral-800">KSh {reminder.monthlyPrice?.toLocaleString()}</span> for {reminder.rentalName} is due.
                      </p>
                      <p className="text-[11px] text-red-500 font-bold mt-1">
                        Due Date: {new Date(reminder.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <a
                        href={`tel:${reminder.tenant?.phone}`}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Tenant
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Tenants & Notifications */}
        <div className="space-y-6">
          {/* Active Tenants List */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-200 bg-slate-50/50">
              <h2 className="font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Tenant Registry
              </h2>
            </div>

            <div className="p-5 max-h-[350px] overflow-y-auto divide-y divide-neutral-100">
              {stats?.activeTenants?.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  No active tenants.
                </div>
              ) : (
                stats?.activeTenants?.map((tenantData, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-bold text-neutral-900 text-sm">{tenantData.tenant?.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{tenantData.rentalName}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><Phone size={12} /> {tenantData.tenant?.phone}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Caretaker Notifications */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-200 bg-slate-50/50">
              <h2 className="font-bold text-neutral-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Caretaker Inbox
              </h2>
            </div>

            <div className="p-5 divide-y divide-neutral-100 max-h-[350px] overflow-y-auto">
              {stats?.notifications?.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  No notifications.
                </div>
              ) : (
                stats?.notifications?.map((n) => (
                  <div key={n._id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-bold text-neutral-900 text-xs">{n.title}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <span className="text-[9px] text-neutral-400 block mt-1">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaretakerDashboard;
