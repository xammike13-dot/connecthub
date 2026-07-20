import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Eye, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminRidesPage = () => {
  const [rides, setRides] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  useEffect(() => {
    fetchRides();
  }, [search, status]);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getRides({ search, status });
      setRides(res.data.data || []);
    } catch (err) {
      console.error('Error fetching rides:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Rides Management</h1>
        <p className="text-slate-400 mt-1">Audit active boda transits, view completed ride logs, and track cancelled trips</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search by Ride ID, customer, or rider..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} className="text-slate-500" />}
          className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="waiting_rider">Waiting Rider</option>
          <option value="accepted">Accepted / Arriving</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950">
                <th className="p-4">Ride ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Rider</th>
                <th className="p-4">Pickup</th>
                <th className="p-4">Destination</th>
                <th className="p-4">Fare</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {rides.map((r) => {
                const isProblematic = r.status === 'cancelled' || r.status === 'declined';
                return (
                  <tr key={r._id} className={`hover:bg-slate-800/30 transition-colors ${isProblematic ? 'bg-red-500/5' : ''}`}>
                    <td className="p-4 font-mono text-white text-xs">{r._id}</td>
                    <td className="p-4 font-medium text-white">{r.customer?.name || 'Deleted Customer'}</td>
                    <td className="p-4">{r.rider?.name || 'Searching Rider...'}</td>
                    <td className="p-4 text-slate-400 truncate max-w-xs">{r.pickupLocation?.name || 'N/A'}</td>
                    <td className="p-4 text-slate-400 truncate max-w-xs">{r.dropoffLocation?.name || 'N/A'}</td>
                    <td className="p-4 font-semibold text-green-400">{formatCurrency(r.fare?.totalFare || r.estimatedPrice || 0)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        r.status === 'in_progress' || r.status === 'accepted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        isProblematic ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {isProblematic && <AlertTriangle size={12} className="mr-0.5" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setSelectedRide(r)}
                      >
                        <Eye size={14} className="mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rides.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 font-semibold">No ride transits registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ride Details Modal */}
      {selectedRide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Navigation size={20} className="text-blue-500" />
              Ride Transit details
            </h3>
            <div className="space-y-3 text-sm">
              <p><strong className="text-slate-400">Ride ID:</strong> <span className="font-mono text-xs">{selectedRide._id}</span></p>
              <p><strong className="text-slate-400">Customer:</strong> {selectedRide.customer?.name} ({selectedRide.customer?.phone || 'N/A'})</p>
              <p><strong className="text-slate-400">Rider:</strong> {selectedRide.rider?.name || 'N/A'} ({selectedRide.rider?.phone || 'N/A'})</p>
              <p><strong className="text-slate-400">Pickup Location:</strong> {selectedRide.pickupLocation?.name}</p>
              <p><strong className="text-slate-400">Destination:</strong> {selectedRide.dropoffLocation?.name}</p>
              <p><strong className="text-slate-400">Estimated Distance:</strong> {selectedRide.estimatedDistance ? `${selectedRide.estimatedDistance} km` : 'N/A'}</p>
              <p><strong className="text-slate-400">Base Fare:</strong> {formatCurrency(selectedRide.fare?.baseFare || 0)}</p>
              <p><strong className="text-slate-400">Platform Commission Share:</strong> {formatCurrency(selectedRide.fare?.platformFee || 0)}</p>
              <p><strong className="text-slate-400">Rider Receives:</strong> {formatCurrency(selectedRide.fare?.riderReceives || 0)}</p>
              <p><strong className="text-slate-400">Total Transit Fare:</strong> {formatCurrency(selectedRide.fare?.totalFare || 0)}</p>
              <p><strong className="text-slate-400">Ride Status:</strong> <span className="capitalize">{selectedRide.status}</span></p>
              <p><strong className="text-slate-400">Requested At:</strong> {new Date(selectedRide.createdAt).toLocaleString()}</p>
              {selectedRide.cancelledAt && (
                <p className="text-red-400"><strong className="text-red-400">Cancellation Reason:</strong> {selectedRide.cancellationReason || 'N/A'}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedRide(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRidesPage;
