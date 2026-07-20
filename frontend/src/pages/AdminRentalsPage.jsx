import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Home, Eye, Flag, ShieldAlert, CheckCircle } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminRentalsPage = () => {
  const [viewMode, setViewMode] = useState('properties'); // 'properties' or 'bookings'
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    if (viewMode === 'properties') {
      fetchProperties();
    } else {
      fetchBookings();
    }
  }, [viewMode, search, status]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getProperties({ search });
      setProperties(res.data.data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getBookings({ search, status });
      setBookings(res.data.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleListingFlag = async (property) => {
    try {
      const updatedAvailability = !property.isAvailable;
      await adminAPI.flagProperty(property._id, { isAvailable: updatedAvailability });
      alert(`Property listing visibility updated successfully.`);
      fetchProperties();
    } catch (err) {
      console.error('Failed to update property status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Rentals & Bookings</h1>
          <p className="text-slate-400 mt-1">Flag suspicious rental listings, monitor tenant bookings, and view escrow details</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'properties' ? 'primary' : 'outline'}
            onClick={() => { setViewMode('properties'); setSearch(''); setStatus(''); }}
          >
            Properties List
          </Button>
          <Button
            variant={viewMode === 'bookings' ? 'primary' : 'outline'}
            onClick={() => { setViewMode('bookings'); setSearch(''); setStatus(''); }}
          >
            Tenant Bookings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder={viewMode === 'properties' ? 'Search properties or landlord...' : 'Search booking, property, landlord or tenant...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} className="text-slate-500" />}
          className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
        />
        {viewMode === 'bookings' && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : viewMode === 'properties' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950">
                <th className="p-4">Property Name</th>
                <th className="p-4">Landlord</th>
                <th className="p-4">Location</th>
                <th className="p-4">Monthly Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {properties.map((p) => (
                <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-semibold text-white">{p.rentalName}</td>
                  <td className="p-4">{p.landlord?.name || 'Deleted User'}</td>
                  <td className="p-4 capitalize">{p.location}</td>
                  <td className="p-4 font-semibold text-green-400">{formatCurrency(p.monthlyPrice)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.isAvailable ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {p.isAvailable ? 'Listed' : 'Flagged / Hidden'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant={p.isAvailable ? 'danger' : 'success'}
                        size="xs"
                        onClick={() => handleToggleListingFlag(p)}
                        title="Toggle Suspicious Listing Status"
                        className="flex items-center gap-1"
                      >
                        <Flag size={14} />
                        {p.isAvailable ? 'Flag Suspect' : 'Unflag'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 font-semibold">No rental properties listed yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950">
                <th className="p-4">Booking ID</th>
                <th className="p-4">Property</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Escrow Value</th>
                <th className="p-4">Escrow Status</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {bookings.map((b) => (
                <tr key={b.bookings?._id || b._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-mono text-white text-xs">{b.bookings?._id || 'N/A'}</td>
                  <td className="p-4 font-semibold text-white">{b.rentalName}</td>
                  <td className="p-4">{b.bookings?.customer?.name || 'Deleted Tenant'}</td>
                  <td className="p-4 font-semibold text-green-400">{formatCurrency(b.bookings?.totalPrice || 0)}</td>
                  <td className="p-4">
                    <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                      {b.bookings?.escrowStatus || 'Held'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      b.bookings?.status === 'confirmed' || b.bookings?.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      b.bookings?.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {b.bookings?.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <Eye size={14} className="mr-1" /> View Details
                    </Button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">No bookings registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-4">Booking Escrow Details</h3>
            <div className="space-y-3 text-sm">
              <p><strong className="text-slate-400">Property:</strong> {selectedBooking.rentalName}</p>
              <p><strong className="text-slate-400">Booking ID:</strong> <span className="font-mono text-xs">{selectedBooking.bookings?._id}</span></p>
              <p><strong className="text-slate-400">Tenant:</strong> {selectedBooking.bookings?.customer?.name} ({selectedBooking.bookings?.customer?.phone})</p>
              <p><strong className="text-slate-400">Monthly Rent:</strong> {formatCurrency(selectedBooking.monthlyPrice)}</p>
              <p><strong className="text-slate-400">Booking Status:</strong> <span className="capitalize">{selectedBooking.bookings?.status}</span></p>
              <p><strong className="text-slate-400">Escrow Value:</strong> {formatCurrency(selectedBooking.bookings?.totalPrice || 0)}</p>
              <p><strong className="text-slate-400">Escrow Status:</strong> <span className="capitalize">{selectedBooking.bookings?.escrowStatus || 'Held'}</span></p>
              <p><strong className="text-slate-400">Move-in Confirmed:</strong> {selectedBooking.bookings?.moveInConfirmed ? 'Yes' : 'No'}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRentalsPage;
