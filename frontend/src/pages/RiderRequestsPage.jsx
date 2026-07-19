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
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { rideAPI, riderAPI, notificationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSocket } from '../context/SocketContext';
import LeafletMap from '../components/maps/LeafletMap';

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

  // Rider's location and Map modal states
  const [riderLocation, setRiderLocation] = useState(null);
  const [showFullMapModal, setShowFullMapModal] = useState(false);
  const [activeRideForMap, setActiveRideForMap] = useState(null);

  // Get rider's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRiderLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('[RiderRequestsPage] Failed to get location:', error);
        }
      );
    }
  }, []);

  // Handle external Google Maps navigation
  const handleStartNavigation = (ride) => {
    const pickupLat = ride.pickupLocation?.coordinates?.[1];
    const pickupLng = ride.pickupLocation?.coordinates?.[0];
    const dropoffLat = ride.dropoffLocation?.coordinates?.[1];
    const dropoffLng = ride.dropoffLocation?.coordinates?.[0];

    if (pickupLat !== undefined && pickupLng !== undefined && dropoffLat !== undefined && dropoffLng !== undefined) {
      // Direct routing with pickup as waypoint and dropoff as final destination
      const url = `https://www.google.com/maps/dir/?api=1&destination=${dropoffLat},${dropoffLng}&waypoints=${pickupLat},${pickupLng}`;
      window.open(url, '_blank');
    } else {
      addToast('Pickup and dropoff coordinates are missing', 'error');
    }
  };

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

            const pickupLat = ride.pickupLocation?.coordinates?.[1];
            const pickupLng = ride.pickupLocation?.coordinates?.[0];
            const dropoffLat = ride.dropoffLocation?.coordinates?.[1];
            const dropoffLng = ride.dropoffLocation?.coordinates?.[0];

            const hasCoords =
              pickupLat !== undefined && pickupLat !== null && !isNaN(pickupLat) &&
              pickupLng !== undefined && pickupLng !== null && !isNaN(pickupLng) &&
              dropoffLat !== undefined && dropoffLat !== null && !isNaN(dropoffLat) &&
              dropoffLng !== undefined && dropoffLng !== null && !isNaN(dropoffLng);

            const mapCenter = hasCoords ? [pickupLat, pickupLng] : [-1.2921, 36.8219];

            const pickupLoc = hasCoords ? {
              lat: pickupLat,
              lng: pickupLng,
              address: ride.pickupLocation?.name || ride.pickupLocation?.address || 'Pickup Location'
            } : null;

            const dropoffLoc = hasCoords ? {
              lat: dropoffLat,
              lng: dropoffLng,
              address: ride.dropoffLocation?.name || ride.dropoffLocation?.address || 'Dropoff Location'
            } : null;

            const routeCoords = hasCoords ? [
              [pickupLat, pickupLng],
              [dropoffLat, dropoffLng]
            ] : [];

            const validRiderLoc = riderLocation ? {
              lat: riderLocation.lat,
              lng: riderLocation.lng,
              address: 'My Location'
            } : null;

            return (
              <div
                key={ride._id}
                id={`ride-${ride._id}`}
                className={`card border-2 transition-all duration-200 ${
                  isHighlighted
                    ? 'border-blue-500 bg-blue-100/70 shadow-md ring-2 ring-blue-200 border-l-4 border-l-blue-600'
                    : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Bike className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">New Ride Request</p>
                    <p className="text-sm text-gray-500">
                      {ride.pickupLocation?.name || ride.pickupLocation?.address || 'Pickup location'} → {ride.dropoffLocation?.name || ride.dropoffLocation?.address || 'Dropoff location'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(ride.fare?.totalFare || ride.estimatedPrice || 0)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ride.estimatedDistance !== null && ride.estimatedDistance !== undefined 
                      ? formatRideDistance(ride.estimatedDistance) 
                      : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pickup Location</p>
                      <p className="font-medium text-gray-900">
                        {ride.pickupLocation?.name || ride.pickupLocation?.address || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <MapPin className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Destination</p>
                      <p className="font-medium text-gray-900">
                        {ride.dropoffLocation?.name || ride.dropoffLocation?.address || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Customer</span>
                    <span className="font-medium">{ride.customer?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Phone</span>
                    <span className="font-medium">{ride.customer?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Requested</span>
                    <span className="font-medium">{formatDate(ride.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Small Embedded Map Preview */}
              <div className="my-4 border rounded-xl overflow-hidden shadow-sm relative" style={{ height: '220px' }}>
                <LeafletMap
                  center={mapCenter}
                  zoom={12}
                  pickupLocation={pickupLoc}
                  dropoffLocation={dropoffLoc}
                  routeCoordinates={routeCoords}
                  showUserLocation={!!validRiderLoc}
                  userLocation={validRiderLoc}
                  height="100%"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
                <Button
                  variant="outline"
                  className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50 flex items-center justify-center gap-1.5 font-bold"
                  onClick={() => {
                    setActiveRideForMap(ride);
                    setShowFullMapModal(true);
                  }}
                >
                  <Navigation size={15} />
                  Open Full Map
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 flex items-center justify-center gap-1.5 font-bold"
                  onClick={() => handleStartNavigation(ride)}
                >
                  <Navigation size={15} className="rotate-45" />
                  Start Navigation
                </Button>

                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50 flex items-center justify-center gap-1.5 font-bold"
                  onClick={() => showDeclineDialog(ride)}
                >
                  <X size={15} />
                  Reject Ride
                </Button>

                <Button 
                  variant="primary" 
                  className="flex-1 flex items-center justify-center gap-1.5 font-bold"
                  onClick={() => acceptRide(ride._id)}
                >
                  <Check size={15} />
                  Accept Ride
                </Button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Full Navigation Map Modal */}
      {activeRideForMap && (
        <Modal
          isOpen={showFullMapModal}
          onClose={() => {
            setShowFullMapModal(false);
            setActiveRideForMap(null);
          }}
          title="Full Navigation Map"
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-lg border">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Customer Name</p>
                <p className="text-sm font-semibold text-gray-900">{activeRideForMap.customer?.name || 'Passenger'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Estimated Distance</p>
                <p className="text-sm font-semibold text-gray-900">
                  {activeRideForMap.estimatedDistance ? `${activeRideForMap.estimatedDistance.toFixed(1)} km` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Estimated Fare</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(activeRideForMap.fare?.totalFare || activeRideForMap.estimatedPrice || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-lg border text-xs">
              <div>
                <span className="font-bold text-green-600">Pickup: </span>
                {activeRideForMap.pickupLocation?.name || activeRideForMap.pickupLocation?.address}
              </div>
              <div>
                <span className="font-bold text-red-600">Dropoff: </span>
                {activeRideForMap.dropoffLocation?.name || activeRideForMap.dropoffLocation?.address}
              </div>
            </div>

            {/* Large Map Container */}
            <div className="border rounded-xl overflow-hidden shadow-sm relative" style={{ height: '400px' }}>
              <LeafletMap
                center={[
                  activeRideForMap.pickupLocation?.coordinates?.[1] || -1.2921,
                  activeRideForMap.pickupLocation?.coordinates?.[0] || 36.8219
                ]}
                zoom={14}
                pickupLocation={{
                  lat: activeRideForMap.pickupLocation?.coordinates?.[1],
                  lng: activeRideForMap.pickupLocation?.coordinates?.[0],
                  address: activeRideForMap.pickupLocation?.name || activeRideForMap.pickupLocation?.address || 'Pickup'
                }}
                dropoffLocation={{
                  lat: activeRideForMap.dropoffLocation?.coordinates?.[1],
                  lng: activeRideForMap.dropoffLocation?.coordinates?.[0],
                  address: activeRideForMap.dropoffLocation?.name || activeRideForMap.dropoffLocation?.address || 'Destination'
                }}
                routeCoordinates={[
                  [activeRideForMap.pickupLocation?.coordinates?.[1], activeRideForMap.pickupLocation?.coordinates?.[0]],
                  [activeRideForMap.dropoffLocation?.coordinates?.[1], activeRideForMap.dropoffLocation?.coordinates?.[0]]
                ]}
                showUserLocation={!!riderLocation}
                userLocation={riderLocation ? {
                  lat: riderLocation.lat,
                  lng: riderLocation.lng,
                  address: 'My Location'
                } : null}
                height="100%"
                showControls={true}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button
                variant="outline"
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5 font-bold"
                onClick={() => handleStartNavigation(activeRideForMap)}
              >
                <Navigation size={15} className="rotate-45" />
                Start Google Maps Navigation
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowFullMapModal(false);
                  setActiveRideForMap(null);
                }}
              >
                Close Map
              </Button>
            </div>
          </div>
        </Modal>
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
