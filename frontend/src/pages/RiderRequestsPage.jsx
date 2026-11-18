import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Phone, 
  Clock,
  DollarSign,
  User,
  RefreshCw,
  X,
  Check,
  Bell,
  AlertCircle,
  Sun,
  Moon,
  Shield,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { rideAPI, riderAPI, notificationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSocket } from '../context/SocketContext';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'KSh 0';
  }
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
};

const formatRideDistance = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined || isNaN(distanceInKm)) {
    return 'N/A';
  }
  
  const distanceInMeters = distanceInKm * 1000;
  
  if (distanceInMeters < 10) {
    return 'Less than 10 m';
  }
  
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }
  
  return `${(distanceInMeters / 1000).toFixed(1)} km`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RiderRequestsPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideIdParam = searchParams.get('rideId') || searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [rideToDecline, setRideToDecline] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [declining, setDeclining] = useState(false);

  // Fetch available ride requests
  const fetchRequests = useCallback(async () => {
    try {
      const response = await rideAPI.getAvailableRides({ limit: 50 });
      setPendingRequests(response.data.data || []);
      
      // Fetch unread count
      try {
        const notifResponse = await notificationAPI.getUnreadCount();
        setUnreadCount(notifResponse.data.count || 0);
      } catch (err) {
        // No notifications
      }
    } catch (error) {
      console.error('Failed to fetch ride requests:', error);
      addToast('Failed to load ride requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Fetch rider online status
  const fetchUserStatus = useCallback(async () => {
    try {
      const profileResponse = await riderAPI.getProfile();
      const profileData = profileResponse.data.data.user;
      setIsOnline(profileData.riderProfile?.isOnline || false);
    } catch (error) {
      console.error('Failed to fetch user status:', error);
    }
  }, []);

  // Accept a ride request
  const acceptRide = async (rideId) => {
    try {
      const response = await rideAPI.accept(rideId);
      addToast('Ride accepted successfully!', 'success');
      
      // Navigate to dashboard to handle the active ride
      navigate('/rider/dashboard');
      
    } catch (error) {
      console.error('Failed to accept ride:', error);
      addToast(error.response?.data?.message || 'Failed to accept ride', 'error');
    }
  };

  // Show decline modal
  const showDeclineDialog = (ride) => {
    setRideToDecline(ride);
    setDeclineReason('');
    setCustomReason('');
    setShowDeclineModal(true);
  };

  // Reject a ride request with reason
  const rejectRide = async () => {
    if (!rideToDecline) return;
    
    // Validate reason
    const finalReason = declineReason === 'Other' ? customReason : declineReason;
    if (!finalReason || finalReason.trim().length === 0) {
      addToast('Please provide a reason for declining', 'error');
      return;
    }

    try {
      setDeclining(true);
      await rideAPI.decline(rideToDecline._id, { reason: finalReason });
      addToast('Ride declined', 'info');
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r._id !== rideToDecline._id));
      setShowDeclineModal(false);
      setRideToDecline(null);
      setDeclineReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Failed to reject ride:', error);
      addToast(error.response?.data?.message || 'Failed to reject ride', 'error');
    } finally {
      setDeclining(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    await fetchUserStatus();
    setRefreshing(false);
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewRideRequest = (data) => {
      console.log('[RiderRequestsPage] New ride request received:', data);
      addToast('New ride request received!', 'info');
      fetchRequests();
    };

    // Backend emits 'ride_request' to rider_{riderId}
    socket.on('ride_request', handleNewRideRequest);

    return () => {
      socket.off('ride_request', handleNewRideRequest);
    };
  }, [socket, addToast, fetchRequests]);

  // Initial data fetch
  useEffect(() => {
    fetchRequests();
    fetchUserStatus();
  }, [fetchRequests, fetchUserStatus]);

  useEffect(() => {
    if (rideIdParam && pendingRequests.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`ride-${rideIdParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [rideIdParam, pendingRequests]);

  // Auto-refresh every 15 seconds when online
  useEffect(() => {
    let interval;
    if (isOnline) {
      interval = setInterval(() => {
        fetchRequests();
      }, 15000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, fetchRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ride Requests</h1>
          <p className="text-gray-600 mt-1">View and accept available ride requests</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Link to="/rider/dashboard">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Online Status Banner */}
      {!isOnline && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              You are currently offline. Go online to receive ride requests.
            </p>
            <Link to="/rider/dashboard">
              <Button variant="primary" size="sm">
                Go Online
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Requests List */}
      {pendingRequests.length === 0 ? (
        <div className="card text-center py-12">
          <Bike className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ride requests available</h3>
          <p className="text-gray-600">
            {isOnline 
              ? 'Waiting for new ride requests. Requests will appear here automatically.'
              : 'Go online to start receiving ride requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {pendingRequests.length} ride request{pendingRequests.length !== 1 ? 's' : ''} available
            </p>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          {pendingRequests.map((ride) => {
            const isHighlighted = ride._id === rideIdParam;
            const fareAmount = ride.fare?.riderReceives || ride.fare?.totalFare || ride.estimatedPrice || 0;
            const isNight = ride.fare?.fareType === 'night' || !!ride.fare?.isNightRate;
            const pickupName = ride.pickupLocation?.name || ride.pickupLocation?.address || 'Pickup';
            const dropoffName = ride.dropoffLocation?.name || ride.dropoffLocation?.address || 'Destination';

            return (
              <div
                key={ride._id}
                id={`ride-${ride._id}`}
                className={`card border-2 transition-all duration-200 rounded-2xl p-5 ${
                  isHighlighted
                    ? 'border-blue-500 bg-blue-50/80 shadow-md ring-2 ring-blue-200 border-l-4 border-l-blue-600'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Header row: Status, Route & Fare */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bike className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
                          New Boda Request
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Fixed Fare
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                          {isNight ? (
                            <>
                              <Moon size={10} /> Night (+KSh 20)
                            </>
                          ) : (
                            <>
                              <Sun size={10} /> Day
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-base font-extrabold text-gray-900 mt-0.5">
                        {pickupName} → {dropoffName}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-green-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium">Your Payout</p>
                    <p className="text-2xl sm:text-3xl font-black text-green-600">
                      {formatCurrency(fareAmount)}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 text-xs">
                  <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-gray-500 font-semibold block">Pickup Location:</span>
                        <span className="font-bold text-gray-900 text-sm">{pickupName}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 pt-1 border-t border-gray-200/60">
                      <Navigation size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-gray-500 font-semibold block">Destination Area:</span>
                        <span className="font-bold text-gray-900 text-sm">{dropoffName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" />
                        Passenger:
                      </span>
                      <span className="font-bold text-gray-900">
                        {ride.customer?.name || 'Customer'}
                      </span>
                    </div>
                    {ride.customer?.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                          <Phone size={14} className="text-gray-400" />
                          Phone:
                        </span>
                        <a
                          href={`tel:${ride.customer.phone}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {ride.customer.phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        Requested:
                      </span>
                      <span className="text-gray-700">{formatDate(ride.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold py-2.5"
                    onClick={() => showDeclineDialog(ride)}
                  >
                    <X size={16} className="mr-1.5" />
                    Decline Request
                  </Button>

                  <Button
                    variant="primary"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 shadow-md shadow-emerald-600/20"
                    onClick={() => acceptRide(ride._id)}
                  >
                    <Check size={16} className="mr-1.5" />
                    Accept Ride ({formatCurrency(fareAmount)})
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Reason Modal */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false);
          setRideToDecline(null);
          setDeclineReason('');
          setCustomReason('');
        }}
        title="Decline Ride Request"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Please provide a reason for declining this ride request.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for declining *
            </label>
            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a reason</option>
              <option value="Too far">Too far</option>
              <option value="Motorcycle issue">Motorcycle issue</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Traffic">Traffic</option>
              <option value="Other">Other (please specify)</option>
            </select>
          </div>

          {declineReason === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify *
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter your reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                required
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineModal(false);
                setRideToDecline(null);
                setDeclineReason('');
                setCustomReason('');
              }}
              disabled={declining}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={rejectRide}
              isLoading={declining}
              disabled={!declineReason || (declineReason === 'Other' && !customReason.trim())}
            >
              Decline Ride
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RiderRequestsPage;
