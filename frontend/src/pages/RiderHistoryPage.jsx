import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bike, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Filter,
  Calendar,
  Download,
  Navigation,
  Phone,
  User,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { rideAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadge = (status) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    rider_assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    arrived: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_rider_available: 'bg-gray-100 text-gray-700',
  };

  const labels = {
    pending: 'Pending',
    accepted: 'Accepted',
    rider_assigned: 'Assigned',
    in_progress: 'In Progress',
    arrived: 'Arrived',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_rider_available: 'No Rider',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

const RiderHistoryPage = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    currentPage: 1,
  });
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 10,
  });
  const [stats, setStats] = useState({
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    totalEarnings: 0,
  });

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await rideAPI.getMyRides(filters);
      
      setRides(response.data.data || []);
      setPagination(response.data.pagination || { total: 0, pages: 1, currentPage: 1 });
      
      // Calculate stats
      const allRides = response.data.data || [];
      setStats({
        totalRides: allRides.length,
        completedRides: allRides.filter(r => r.status === 'completed').length,
        cancelledRides: allRides.filter(r => r.status === 'cancelled').length,
        totalEarnings: allRides
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (r.fare?.totalFare || 0), 0),
      });
    } catch (error) {
      console.error('Failed to fetch rides:', error);
      addToast('Failed to load ride history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset to page 1 when changing other filters
    }));
  };

  const handleNavigate = (address, coordinates) => {
    if (coordinates?.coordinates) {
      const [lng, lat] = coordinates.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    } else if (address) {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ride History</h1>
          <p className="text-gray-600 mt-1">View all your completed and past rides</p>
        </div>
        <Link to="/rider/dashboard">
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bike className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedRides}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelledRides}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      {/* Rides List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : rides.length === 0 ? (
        <div className="card text-center py-12">
          <Bike className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rides found</h3>
          <p className="text-gray-600">Go online to start receiving ride requests</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Route</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Customer</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Fare</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Distance</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rides.map((ride) => (
                  <tr key={ride._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formatDate(ride.completedAt || ride.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="text-sm text-gray-800 truncate">
                          {ride.pickupLocation?.address || 'Unknown pickup'}
                        </span>
                        <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-800 truncate">
                          {ride.dropoffLocation?.address || 'Unknown dropoff'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {ride.customer?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(ride.fare?.totalFare || ride.estimatedPrice || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">
                        {ride.estimatedDistance ? `${ride.estimatedDistance} km` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(ride.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleNavigate(ride.dropoffLocation?.address, ride.dropoffLocation?.coordinates)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View on map"
                        >
                          <Navigation size={16} />
                        </button>
                        {ride.customer?.phone && (
                          <button
                            onClick={() => window.location.href = `tel:${ride.customer.phone}`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Call customer"
                          >
                            <Phone size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(pagination.currentPage - 1) * filters.limit + 1} to{' '}
                {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total} rides
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === 1}
                  onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === pagination.pages}
                  onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RiderHistoryPage;