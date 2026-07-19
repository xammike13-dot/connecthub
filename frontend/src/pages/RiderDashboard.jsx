import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Phone, 
  MessageCircle,
  Clock,
  DollarSign,
  Star,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  RefreshCw,
  TrendingUp,
  Power,
  Bell,
  Calendar,
  Truck,
  Navigation2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Button from '../components/ui/Button';
import { rideAPI, riderAPI, notificationAPI } from '../services/api';
import LeafletMap from '../components/maps/LeafletMap';
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

const RiderDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { socket } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    pendingTrips: 0,
    cancelledTrips: 0,
    tripsToday: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    claimableBalance: 0,
    withdrawnAmount: 0,
    rating: 5.0,
    reviewsCount: 0,
    rideRequestsCount: 0,
    distanceTravelled: 0,
  });
  
  const [isOnline, setIsOnline] = useState(false);
  const [riderStatus, setRiderStatus] = useState('offline');
  const [activeRide, setActiveRide] = useState(null);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [recentRides, setRecentRides] = useState([]);
  const [riderLocation, setRiderLocation] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [rideStatus, setRideStatus] = useState('idle');
  
  // Earnings trend chart state
  const [earningsTrend, setEarningsTrend] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('7d');
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [earningsSummary, setEarningsSummary] = useState({
    highest: 0,
    lowest: 0,
    average: 0,
  });
  
  // Use a ref to track the current online status for use in callbacks
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await riderAPI.getDashboardStats();
      const statsData = statsResponse.data.data;
      
      setStats({
        totalTrips: statsData.totalTrips || 0,
        completedTrips: statsData.completedTrips || 0,
        pendingTrips: statsData.pendingTrips || 0,
        cancelledTrips: statsData.cancelledTrips || 0,
        tripsToday: statsData.tripsToday || 0,
        totalEarnings: statsData.totalEarnings || 0,
        pendingEarnings: statsData.pendingEarnings || 0,
        claimableBalance: statsData.claimableBalance || 0,
        withdrawnAmount: statsData.withdrawnAmount || 0,
        rating: statsData.rating || 5.0,
        reviewsCount: statsData.reviewsCount || 0,
        rideRequestsCount: statsData.rideRequestsCount || 0,
        distanceTravelled: statsData.distanceTravelled || 0,
      });
      
      setRecentRides(statsData.recentRides || []);
      
      // Fetch active ride
      try {
        const activeRideResponse = await riderAPI.getActiveRide();
        if (activeRideResponse.data.data) {
          setActiveRide(activeRideResponse.data.data);
        } else {
          setActiveRide(null);
        }
      } catch (err) {
        setActiveRide(null);
      }
      
      // Fetch available ride requests if online
      if (isOnlineRef.current) {
        try {
          const availResponse = await rideAPI.getAvailableRides({ limit: 10 });
          setAvailableRequests(availResponse.data.data || []);
        } catch (err) {
          setAvailableRequests([]);
        }
      } else {
        setAvailableRequests([]);
      }
      
      // Fetch notifications
      try {
        const notifResponse = await notificationAPI.getUnreadCount();
        setUnreadCount(notifResponse.data.count || 0);
      } catch (err) {
        // No notifications
      }
      
    } catch (error) {
      console.error('Failed to fetch rider data:', error);
      if (error.response?.status !== 401) {
        addToast('Failed to load dashboard data', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Fetch user's online status
  const fetchUserStatus = useCallback(async () => {
    try {
      const profileResponse = await riderAPI.getProfile();
      const profileData = profileResponse.data.data.user;
      
      const onlineState = profileData.riderProfile?.isOnline || false;
      setIsOnline(onlineState);
      isOnlineRef.current = onlineState;
      setRiderStatus(profileData.riderProfile?.status || 'offline');
    } catch (error) {
      console.error('Failed to fetch user status:', error);
    }
  }, []);

  // Fetch earnings trend data
  const fetchEarningsTrend = useCallback(async (period = '7d') => {
    try {
      setLoadingTrend(true);
      const response = await riderAPI.getEarningsTrend({ period });
      const trendData = response.data.data.trend || [];
      const summaryData = response.data.data.summary || {
        highest: 0,
        lowest: 0,
        average: 0,
      };
      
      // Format the data for the chart - use "Jun 24" format
      const formattedData = trendData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-KE', { 
          month: 'short',
          day: 'numeric'
        }),
        earnings: item.earnings || 0,
        rideCount: item.rideCount || 0,
        fullDate: item.date,
      }));
      
      setEarningsTrend(formattedData);
      setEarningsSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch earnings trend:', error);
      setEarningsTrend([]);
      setEarningsSummary({
        highest: 0,
        lowest: 0,
        average: 0,
      });
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  // Handle period filter change
  const handlePeriodChange = (period) => {
    setChartPeriod(period);
    fetchEarningsTrend(period);
  };

  // Get rider's location and set up live tracking
  const setupLocationTracking = useCallback(() => {
    // Clear existing watch if any
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }

    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by this browser', 'error');
      return;
    }

    // Request permission and start tracking
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'denied') {
        addToast('Location permission denied. Please enable in browser settings.', 'error');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          setRiderLocation(location);
          
          if (isOnlineRef.current) {
            try {
              const locationPayload = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              
              if (activeRide && activeRide._id) {
                locationPayload.rideId = activeRide._id;
              }
              
              await riderAPI.updateLocation(locationPayload);
            } catch (error) {
              console.error('Failed to update location:', error);
            }
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
      
      setLocationWatchId(watchId);
    });
  }, [addToast, activeRide]);

  // Handle toggle online/offline
  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      
      await riderAPI.updateOnlineStatus({
        isOnline: newStatus,
        status: newStatus ? 'online' : 'offline',
      });
      
      setIsOnline(newStatus);
      isOnlineRef.current = newStatus;
      setRiderStatus(newStatus ? 'online' : 'offline');
      
      if (newStatus) {
        addToast('You are now online and receiving ride requests', 'success');
        setupLocationTracking();
        // Fetch requests right away
        fetchDashboardData();
      } else {
        addToast('You are now offline', 'info');
        setAvailableRequests([]);
        if (locationWatchId !== null) {
          navigator.geolocation.clearWatch(locationWatchId);
          setLocationWatchId(null);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      addToast('Failed to update status', 'error');
    }
  };

  const acceptRide = async (rideId) => {
    try {
      await rideAPI.accept(rideId);
      addToast('Ride request accepted successfully!', 'success');
      fetchDashboardData();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to accept ride', 'error');
    }
  };

  const declineRide = async (rideId) => {
    try {
      await rideAPI.decline(rideId, { reason: 'Unavailable' });
      addToast('Ride request declined', 'info');
      setAvailableRequests(prev => prev.filter(r => r._id !== rideId));
    } catch (error) {
      addToast('Failed to decline ride request', 'error');
    }
  };

  // Update ride status
  const updateRideStatus = async (newStatus) => {
    if (!activeRide) return;
    
    try {
      setRideStatus('updating');
      
      await rideAPI.updateStatus(activeRide._id, newStatus);
      
      if (newStatus === 'completed') {
        addToast('Ride completed successfully!', 'success');
      } else if (newStatus === 'in_progress') {
        addToast('Ride started successfully', 'success');
      } else if (newStatus === 'awaiting_customer_confirmation') {
        addToast('Waiting for customer to confirm arrival', 'info');
      } else {
        addToast(`Ride status updated to ${newStatus}`, 'success');
      }
      
      setActiveRide(prev => prev ? { ...prev, status: newStatus } : null);
      
      if (newStatus === 'completed') {
        setTimeout(() => {
          setActiveRide(null);
          fetchDashboardData();
          addToast('Wallet updated successfully', 'success');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Failed to update ride status:', error);
      addToast(error.response?.data?.message || 'Failed to update ride status', 'error');
    } finally {
      setRideStatus('idle');
    }
  };

  // Navigate to location
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

  // Contact customer
  const contactCustomer = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await fetchUserStatus();
    setRefreshing(false);
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewRideRequest = (data) => {
      addToast('New ride request received!', 'info');
      fetchDashboardData();
    };

    const handleRideAccepted = (data) => {
      addToast('Ride has been accepted', 'success');
      fetchDashboardData();
    };

    const handleRideStatusUpdate = (data) => {
      fetchDashboardData();
    };

    socket.on('new_ride_request', handleNewRideRequest);
    socket.on('ride_request', handleNewRideRequest); // Handle both types just in case
    socket.on('ride_accepted', handleRideAccepted);
    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('ride_cancelled', handleRideStatusUpdate);
    socket.on('payment_released', handleRideStatusUpdate);
    socket.on('payment_confirmed', handleRideStatusUpdate);
    socket.on('ride_completed_confirmed', handleRideStatusUpdate);
    socket.on('new_notification', handleRideStatusUpdate);

    return () => {
      socket.off('new_ride_request', handleNewRideRequest);
      socket.off('ride_request', handleNewRideRequest);
      socket.off('ride_accepted', handleRideAccepted);
      socket.off('ride_status_update', handleRideStatusUpdate);
      socket.off('ride_cancelled', handleRideStatusUpdate);
      socket.off('payment_released', handleRideStatusUpdate);
      socket.off('payment_confirmed', handleRideStatusUpdate);
      socket.off('ride_completed_confirmed', handleRideStatusUpdate);
      socket.off('new_notification', handleRideStatusUpdate);
    };
  }, [socket, addToast, fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
      fetchUserStatus();
      fetchEarningsTrend('7d');
    }
  }, [authLoading, user, fetchDashboardData, fetchUserStatus, fetchEarningsTrend]);

  // Setup location tracking when coming online
  useEffect(() => {
    if (isOnline && user) {
      setupLocationTracking();
    }
    
    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [isOnline, setupLocationTracking, user]);

  // Auto-refresh dashboard every 20 seconds when online
  useEffect(() => {
    let interval;
    if (isOnline) {
      interval = setInterval(() => {
        fetchDashboardData();
      }, 20000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, fetchDashboardData]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check if there are active ride unassigned or current trip tasks
  const hasActiveTasks = activeRide || (isOnline && availableRequests.length > 0);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`card ${isOnline ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 'bg-gradient-to-r from-red-500 to-red-600 text-white'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 flex items-center justify-center border-2 border-white/30 flex-shrink-0">
              {user?.riderProfile?.profilePhoto || user?.avatar ? (
                <img 
                  src={user?.riderProfile?.profilePhoto || user?.avatar} 
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium opacity-90">Current Status</p>
              <p className="text-3xl font-bold mt-1">
                {isOnline ? 'You are Online' : 'You are Offline'}
              </p>
              <p className="mt-2 opacity-80 text-sm">
                {isOnline 
                  ? 'You are actively receiving ride requests'
                  : 'Go online to start receiving ride requests'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-white/10 hover:bg-white/25 rounded-lg text-white font-bold transition-all disabled:opacity-50"
              title="Refresh stats"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={toggleOnlineStatus}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md ${
                isOnline
                  ? 'bg-white text-green-600 hover:bg-green-50'
                  : 'bg-white text-red-600 hover:bg-red-50'
              }`}
            >
              <Power size={20} />
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      </div>

      {/* FEATURE 1: ACTIVE TASKS AT THE TOP OF EVERY DASHBOARD (Rider Dashboard) */}
      {hasActiveTasks && (
        <div className="bg-orange-50/40 p-5 rounded-2xl border border-orange-100 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
            <h2 className="text-lg font-extrabold text-neutral-900 uppercase tracking-wide">
              Active Ride Actions & Trips
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 1. Active Trip (Assigned Ride) */}
            {(() => {
              if (!activeRide) return null;

              const pickupLat = activeRide?.pickupLocation?.coordinates?.[1];
              const pickupLng = activeRide?.pickupLocation?.coordinates?.[0];
              const dropoffLat = activeRide?.dropoffLocation?.coordinates?.[1];
              const dropoffLng = activeRide?.dropoffLocation?.coordinates?.[0];

              const hasCoords =
                pickupLat !== undefined && pickupLat !== null && !isNaN(pickupLat) &&
                pickupLng !== undefined && pickupLng !== null && !isNaN(pickupLng) &&
                dropoffLat !== undefined && dropoffLat !== null && !isNaN(dropoffLat) &&
                dropoffLng !== undefined && dropoffLng !== null && !isNaN(dropoffLng);

              const mapCenter = hasCoords ? [pickupLat, pickupLng] : [-1.2921, 36.8219];

              const pickupLoc = hasCoords ? {
                lat: pickupLat,
                lng: pickupLng,
                address: activeRide?.pickupLocation?.name || activeRide?.pickupLocation?.address || 'Pickup Location'
              } : null;

              const dropoffLoc = hasCoords ? {
                lat: dropoffLat,
                lng: dropoffLng,
                address: activeRide?.dropoffLocation?.name || activeRide?.dropoffLocation?.address || 'Dropoff Location'
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
                <div className="bg-white border-2 border-blue-300 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-md border border-blue-200">
                        <Bike className="w-3 h-3" />
                        Current Trip
                      </span>
                      <span className="text-xs font-bold text-neutral-400">
                        #{activeRide._id?.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-neutral-800 line-clamp-1">
                      Route: {activeRide.pickupLocation?.name || activeRide.pickupLocation?.address} → {activeRide.dropoffLocation?.name || activeRide.dropoffLocation?.address}
                    </p>

                    <div className="mt-2.5 space-y-1 bg-neutral-50 p-2 rounded-lg border border-neutral-100 text-xs">
                      <p><span className="font-bold">Customer:</span> {activeRide.customer?.name || 'Passenger'}</p>
                      <p><span className="font-bold">Fare:</span> {formatCurrency(activeRide.fare?.totalFare || activeRide.estimatedPrice || 0)}</p>
                      <p><span className="font-bold">Status:</span> <span className="font-extrabold capitalize text-blue-600">{activeRide.status}</span></p>
                    </div>

                    {activeRide.status === 'accepted' && (
                      <p className="text-[11px] text-amber-600 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-100 mt-2">
                        Rider Accepted. Pickup pending. Navigate to customer to start trip.
                      </p>
                    )}
                    {activeRide.status === 'in_progress' && (
                      <p className="text-[11px] text-blue-600 font-bold bg-blue-50 p-1.5 rounded-lg border border-blue-100 mt-2">
                        On Trip. Drive safely to destination.
                      </p>
                    )}
                    {activeRide.status === 'awaiting_customer_confirmation' && (
                      <p className="text-[11px] text-green-600 font-bold bg-green-50 p-1.5 rounded-lg border border-green-100 mt-2">
                        Trip completed. Awaiting passenger payment release.
                      </p>
                    )}

                    {/* Embedded Active Trip Map */}
                    <div className="my-3 border rounded-xl overflow-hidden shadow-sm relative" style={{ height: '220px' }}>
                      <LeafletMap
                        center={mapCenter}
                        zoom={13}
                        pickupLocation={pickupLoc}
                        dropoffLocation={dropoffLoc}
                        routeCoordinates={routeCoords}
                        showUserLocation={!!validRiderLoc}
                        userLocation={validRiderLoc}
                        height="100%"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        if (hasCoords) {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${dropoffLat},${dropoffLng}&waypoints=${pickupLat},${pickupLng}`;
                          window.open(url, '_blank');
                        } else {
                          handleNavigate(activeRide.pickupLocation?.address, activeRide.pickupLocation?.coordinates);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <Navigation size={12} className="rotate-45" />
                      Navigate
                    </button>

                  {activeRide.status === 'accepted' && (
                    <button
                      onClick={() => updateRideStatus('in_progress')}
                      disabled={rideStatus === 'updating'}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-sm"
                    >
                      Start Trip
                    </button>
                  )}

                  {activeRide.status === 'in_progress' && (
                    <button
                      onClick={() => updateRideStatus('awaiting_customer_confirmation')}
                      disabled={rideStatus === 'updating'}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-lg shadow-sm"
                    >
                      Mark Arrived
                    </button>
                  )}

                  {activeRide.customer?.phone && (
                    <button
                      onClick={() => contactCustomer(activeRide.customer?.phone)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      <Phone size={11} className="stroke-[2.5]" />
                      Call
                    </button>
                  )}
                </div>
              </div>
            );})()}

            {/* 2. Available/Unassigned Ride Requests */}
            {isOnline && availableRequests.map(ride => (
              <div key={ride._id} className="bg-white border-2 border-orange-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-black uppercase rounded-md border border-orange-200 animate-pulse">
                      <Bike className="w-3 h-3" />
                      New Ride Request
                    </span>
                    <span className="text-xs font-bold text-neutral-400">
                      #{ride._id?.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-neutral-800 line-clamp-1">
                    {ride.pickupLocation?.address} → {ride.dropoffLocation?.address}
                  </p>

                  <div className="mt-2.5 space-y-1 bg-neutral-50 p-2 rounded-lg border border-neutral-100 text-xs">
                    <p><span className="font-bold">Distance:</span> {ride.estimatedDistance ? `${ride.estimatedDistance.toFixed(1)} km` : 'N/A'}</p>
                    <p><span className="font-bold">Fare:</span> <span className="text-green-600 font-extrabold">{formatCurrency(ride.fare?.totalFare || ride.estimatedPrice || 0)}</span></p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2">
                  <button
                    onClick={() => acceptRide(ride._id)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-lg shadow-sm"
                  >
                    Accept Ride
                  </button>
                  <button
                    onClick={() => declineRide(ride._id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}

          </div>
        </div>
      )}


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Total Trips</p>
              <p className="text-3xl font-bold text-secondary-800">{stats.totalTrips}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bike className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Today's Trips</p>
              <p className="text-3xl font-bold text-secondary-800">{stats.tripsToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Total Earnings</p>
              <p className="text-3xl font-bold text-secondary-800">{formatCurrency(stats.totalEarnings)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Claimable Balance</p>
              <p className="text-3xl font-bold text-secondary-800">{formatCurrency(stats.claimableBalance)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Rating</p>
              <p className="text-2xl font-bold text-secondary-800">{stats.rating} / 5.0</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Reviews</p>
              <p className="text-2xl font-bold text-secondary-800">{stats.reviewsCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Ride Requests Waiting</p>
              <p className="text-2xl font-bold text-secondary-800">{stats.rideRequestsCount}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Distance Travelled</p>
              <p className="text-2xl font-bold text-secondary-800">{formatRideDistance(stats.distanceTravelled)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Pending Earnings</p>
              <p className="text-xl font-bold text-secondary-800">{formatCurrency(stats.pendingEarnings)}</p>
            </div>
            <div className="w-10 h-10 bg-orange-55 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Withdrawn Amount</p>
              <p className="text-xl font-bold text-secondary-800">{formatCurrency(stats.withdrawnAmount)}</p>
            </div>
            <div className="w-10 h-10 bg-green-55 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500 mb-1">Cancelled Trips</p>
              <p className="text-xl font-bold text-secondary-800">{stats.cancelledTrips}</p>
            </div>
            <div className="w-10 h-10 bg-red-55 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Trend Chart */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-secondary-800">Earnings Trend</h2>
          <div className="flex flex-wrap gap-2">
            {['7d', '30d', 'thisMonth', 'thisYear'].map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  chartPeriod === period
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                {period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : period === 'thisMonth' ? 'This Month' : 'This Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        {!loadingTrend && stats.completedTrips > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-1">Highest</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(earningsSummary.highest)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <p className="text-xs text-red-600 font-medium mb-1">Lowest</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(earningsSummary.lowest)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">Average</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(earningsSummary.average)}/day</p>
            </div>
          </div>
        )}
        
        {loadingTrend ? (
          <div className="flex items-center justify-center h-80">
            <LoadingSpinner size="lg" />
          </div>
        ) : earningsTrend.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-secondary-500">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-secondary-100 rounded-full flex items-center justify-center">
                <Bike className="w-10 h-10 text-secondary-300" />
              </div>
              <p className="text-lg font-medium text-secondary-700 mb-2">No earnings data yet</p>
              <p className="text-sm text-secondary-500">Complete rides to see your earnings trend</p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsTrend}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  tickFormatter={(value) => `KES ${value}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200 min-w-[160px]">
                          <p className="font-semibold text-gray-800 mb-2">{data.date}</p>
                          <p className="text-green-600 font-bold text-lg mb-1">{formatCurrency(data.earnings)}</p>
                          <p className="text-sm text-gray-600">Completed rides: {data.rideCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#earningsGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ fill: '#2563EB', strokeWidth: 2, r: 5, fillOpacity: 1 }}
                  activeDot={{ r: 7, stroke: '#2563EB', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/rider/requests" className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium">View Requests</span>
          </Link>
          <Link to="/rider/history" className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium">Ride History</span>
          </Link>
          <Link to="/wallet" className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="font-medium">Wallet</span>
          </Link>
          <Link to="/rider/profile" className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-red-600" />
            </div>
            <span className="font-medium">My Profile</span>
          </Link>
        </div>
      </div>

      {/* Recent Rides */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary-800">Recent Rides</h2>
          <Link to="/rider/history" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all
          </Link>
        </div>
        {recentRides.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-secondary-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Route</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Fare</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRides.map((ride) => (
                  <tr key={ride._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-secondary-800">{ride.pickupLocation}</span>
                        <ChevronRight className="w-4 h-4 text-secondary-400" />
                        <span className="text-secondary-800">{ride.dropoffLocation}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-secondary-800 font-medium">
                      {formatCurrency(ride.fare || 0)}
                    </td>
                    <td className="py-3 px-4 text-secondary-600">
                      {formatDate(ride.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ride.status === 'completed' ? 'bg-green-100 text-green-600' :
                        ride.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {ride.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary-500">
            <Bike className="w-12 h-12 mx-auto mb-3 text-secondary-300" />
            <p>No rides completed yet</p>
            <p className="text-sm mt-1">Your completed rides will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;