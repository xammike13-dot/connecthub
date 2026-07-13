import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Clock, 
  Phone,
  AlertCircle,
  CheckCircle,
  X,
  Loader,
  User,
  Star,
  ChevronRight,
  Info,
  Shield,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { rideAPI, riderAPI, paymentAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/Toast';
import { 
  LocationSelector, 
  NearbyRidersMap, 
  RouteDisplay,
  fallbackLocations 
} from '../components/maps';
import { isValidLatLng, validateRouteCoordinates } from '../utils/mapValidation';
import { useSocket } from '../context/SocketContext';

// Payment status constants
const PAYMENT_STATUS = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  WAITING: 'waiting',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Booking flow steps
const BOOKING_STEP = {
  LOCATION: 'location',
  RIDER_SELECTION: 'rider_selection',
  FARE_SUMMARY: 'fare_summary',
  PAYMENT: 'payment',
  WAITING_ACCEPTANCE: 'waiting_acceptance',
  TRACKING: 'tracking',
};

const BodabodaPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // Location states
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  // UI states
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingStep, setBookingStep] = useState(BOOKING_STEP.LOCATION);
  
  // Data states
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [rideRequest, setRideRequest] = useState(null);
  const [fareBreakdown, setFareBreakdown] = useState(null);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [rideStatus, setRideStatus] = useState('pending');
  
  // Payment states
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.IDLE);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [waitingForRiderAcceptance, setWaitingForRiderAcceptance] = useState(false);
  const [riderDeclinedMessage, setRiderDeclinedMessage] = useState(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
            name: 'My Location',
          };
          setUserLocation(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation({
            lat: fallbackLocations.nairobi[0],
            lng: fallbackLocations.nairobi[1],
            address: 'Nairobi, Kenya',
            name: 'Nairobi (Default)',
          });
        }
      );
    } else {
      setUserLocation({
        lat: fallbackLocations.nairobi[0],
        lng: fallbackLocations.nairobi[1],
        address: 'Nairobi, Kenya',
        name: 'Nairobi (Default)',
      });
    }
  }, []);

  // Handle location confirmation from LocationSelector
  const handleLocationConfirm = ({ pickup, dropoff }) => {
    setPickupLocation(pickup);
    setDropoffLocation(dropoff);
    setShowLocationSelector(false);
    searchRiders(pickup, dropoff);
  };

  // Search for nearby riders and show selectable list
  const searchRiders = async (pickup, dropoff) => {
    if (!user) {
      alert('Please login to search for riders');
      return;
    }

    const effectivePickup = pickup || pickupLocation;
    const effectiveDropoff = dropoff || dropoffLocation;
    
    if (!effectivePickup || !effectiveDropoff) {
      setMapError('Please select both pickup and dropoff locations.');
      return;
    }
    
    if (!isValidLatLng(effectivePickup.lat, effectivePickup.lng) || 
        !isValidLatLng(effectiveDropoff.lat, effectiveDropoff.lng)) {
      setMapError('Invalid location coordinates. Please select valid locations.');
      return;
    }
    
    try {
      setLoading(true);
      setMapError(null);
      
      // Generate route coordinates
      const route = generateMockRoute(effectivePickup, effectiveDropoff);
      setRouteCoordinates(route);
      
      // Calculate estimated distance and time
      const distance = calculateDistance(
        effectivePickup.lat, 
        effectivePickup.lng, 
        effectiveDropoff.lat, 
        effectiveDropoff.lng
      );
      setEstimatedDistance(distance.toFixed(1));
      setEstimatedTime(Math.round(distance * 3)); // ~3 min per km
      
      // Get nearby riders with sanitized data (no phone numbers before payment)
      const response = await riderAPI.getNearbyRiders({
        latitude: effectivePickup.lat,
        longitude: effectivePickup.lng,
        maxDistance: 10000, // 10km radius
      });
      
      if (response.data.success) {
        const riders = response.data.data || [];
        if (riders.length === 0) {
          setMapError('No riders available in your area right now.');
          setBookingStep(BOOKING_STEP.LOCATION);
        } else {
          // Sanitize rider data - remove phone numbers before payment
          const sanitizedRiders = riders.map(r => ({
            id: r.id || r._id,
            name: r.name,
            avatar: r.avatar,
            rating: r.rating,
            vehicleType: r.vehicleType,
            distance: r.distance,
            // NOTE: phone, email, and other personal details are NOT included
          }));
          setNearbyRiders(sanitizedRiders);
          setBookingStep(BOOKING_STEP.RIDER_SELECTION);
        }
      }
    } catch (error) {
      console.error('[searchRiders] Error:', error);
      setMapError('Failed to load nearby riders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Select a rider and calculate fare with their rates
  const selectRider = async (rider) => {
    if (!user) {
      alert('Please login to book a ride');
      return;
    }
    
    setSelectedRider(rider);
    setLoading(true);
    
    try {
      // Calculate fare with selected rider's actual rates
      const fareResponse = await rideAPI.calculateFareWithRider({
        pickupLocation: {
          address: pickupLocation.address || pickupLocation.name,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(pickupLocation.lng), parseFloat(pickupLocation.lat)],
          },
        },
        dropoffLocation: {
          address: dropoffLocation.address || dropoffLocation.name,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(dropoffLocation.lng), parseFloat(dropoffLocation.lat)],
          },
        },
        riderId: rider.id,
      });
      
      if (fareResponse.data.success) {
        setFareBreakdown(fareResponse.data.data);
        setBookingStep(BOOKING_STEP.FARE_SUMMARY);
      }
    } catch (error) {
      console.error('[selectRider] Fare calculation error:', error);
      // Fallback to default rate calculation
      const fareResponse = await rideAPI.calculateFare({
        pickupLocation: {
          address: pickupLocation.address || pickupLocation.name,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(pickupLocation.lng), parseFloat(pickupLocation.lat)],
          },
        },
        dropoffLocation: {
          address: dropoffLocation.address || dropoffLocation.name,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(dropoffLocation.lng), parseFloat(dropoffLocation.lat)],
          },
        },
      });
      
      if (fareResponse.data.success) {
        setFareBreakdown(fareResponse.data.data);
        setBookingStep(BOOKING_STEP.FARE_SUMMARY);
      }
    } finally {
      setLoading(false);
    }
  };

  // Go back to rider selection
  const changeRider = () => {
    setSelectedRider(null);
    setFareBreakdown(null);
    setBookingStep(BOOKING_STEP.RIDER_SELECTION);
  };

  // Proceed to payment
  const proceedToPayment = () => {
    if (!selectedRider) {
      setPaymentError('Please select a rider first');
      return;
    }
    setBookingStep(BOOKING_STEP.PAYMENT);
    setShowPaymentModal(true);
  };

  // Start payment process
  const startPaymentProcess = () => {
    if (!user) {
      alert('Please login to book a ride');
      return;
    }

    if (user.role !== 'customer') {
      alert('Only customers can book rides.');
      return;
    }

    if (!pickupLocation || !dropoffLocation) {
      alert('Please select pickup and dropoff locations');
      return;
    }

    if (!selectedRider) {
      alert('Please select a rider');
      return;
    }

    if (!mpesaPhone || !mpesaPhone.trim()) {
      setPaymentError('Please enter your M-Pesa phone number');
      return;
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^(\+254|254|0)?([1-9]\d{8})$/;
    const formattedPhone = mpesaPhone.replace(/\s/g, '');
    if (!phoneRegex.test(formattedPhone)) {
      setPaymentError('Please enter a valid M-Pesa phone number (e.g., 0712345678)');
      return;
    }

    initiateStkPush(formattedPhone);
  };

  // Initiate STK Push with riderId
  const initiateStkPush = async (phoneNumber) => {
    try {
      setLoading(true);
      setPaymentStatus(PAYMENT_STATUS.INITIATING);
      setPaymentError(null);

      const payload = {
        pickupLocation: {
          address: pickupLocation.address || pickupLocation.name,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(pickupLocation.lng), parseFloat(pickupLocation.lat)],
          },
        },
        dropoffLocation: {
          address: dropoffLocation.address || dropoffLocation.name,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(dropoffLocation.lng), parseFloat(dropoffLocation.lat)],
          },
        },
        phoneNumber: phoneNumber,
        riderId: selectedRider.id,
      };

      console.log('[RIDE PAYMENT PAYLOAD]', payload);
      console.log('[RIDE PAYMENT] User:', user);
      console.log('[RIDE PAYMENT] Selected Rider:', selectedRider);

      const response = await paymentAPI.initiateWithRider(payload);

      if (response.data.success) {
        const { transactionRef, amount, fare } = response.data.data;
        setTransactionRef(transactionRef);
        setPaymentStatus(PAYMENT_STATUS.WAITING);
        setShowPaymentModal(false);

        // Update fare display with actual calculated fare
        if (fare) {
          setFareBreakdown(fare);
        }

        // Start polling for payment status
        startPaymentPolling(transactionRef);
      } else {
        throw new Error(response.data.message || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('[initiateStkPush] Error:', error);
      setPaymentStatus(PAYMENT_STATUS.FAILED);
      setPaymentError(error.response?.data?.message || 'Failed to initiate STK Push.');
      setLoading(false);
    }
  };

  // Start polling for payment status
  const startPaymentPolling = useCallback((ref) => {
    const interval = setInterval(async () => {
      try {
        const response = await paymentAPI.verify(ref);
        
        if (response.data.success) {
          const { status, rideRequest: newRideRequest } = response.data.data;
          
          if (status === 'SUCCESS') {
            clearInterval(interval);
            setPaymentStatus(PAYMENT_STATUS.SUCCESS);
            setPaymentError(null);
            
            if (newRideRequest) {
              setRideRequest(newRideRequest);
            }
            
            // Move to waiting for rider acceptance - show success message, NOT spinner
            setShowPaymentModal(false);
            setBookingStep(BOOKING_STEP.WAITING_ACCEPTANCE);
            setWaitingForRiderAcceptance(false); // Changed from true to false - show success message
            
          } else if (status === 'FAILED' || status === 'CANCELLED') {
            clearInterval(interval);
            setPaymentStatus(status === 'FAILED' ? PAYMENT_STATUS.FAILED : PAYMENT_STATUS.CANCELLED);
            setPaymentError(status === 'FAILED' ? 'Payment failed.' : 'Payment was cancelled.');
          }
        }
      } catch (error) {
        console.error('[startPaymentPolling] Error:', error);
      }
    }, 3000);

    setPollingInterval(interval);
    
    // Auto-stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (paymentStatus === PAYMENT_STATUS.WAITING) {
        setPaymentStatus(PAYMENT_STATUS.FAILED);
        setPaymentError('Payment verification timed out.');
      }
    }, 5 * 60 * 1000);
  }, [paymentStatus, socket]);

  // Handle ride accepted event
  const handleRideAccepted = useCallback((data) => {
    console.log('[handleRideAccepted] Ride accepted:', data);
    
    if (data.rideId === rideRequest?._id || data.riderId === selectedRider?.id) {
      setWaitingForRiderAcceptance(false);
      setRideStatus('accepted');
      
      // Update ride request with rider info (now revealed after acceptance)
      setRideRequest(prev => ({
        ...prev,
        rider: {
          _id: data.riderId,
          name: data.riderName,
          phone: data.riderPhone,
          motorcycle: data.riderProfile?.motorcycle,
        },
        fare: data.updatedFare || fareBreakdown,
      }));
      
      setBookingStep(BOOKING_STEP.TRACKING);
      addToast(`${data.riderName} has accepted your ride request!`, 'success');
    }
  }, [rideRequest, selectedRider, fareBreakdown, socket, addToast]);

  // Handle ride declined event
  const handleRideDeclined = useCallback((data) => {
    console.log('[handleRideDeclined] Ride declined:', data);
    
    if (data.riderId === selectedRider?.id) {
      setWaitingForRiderAcceptance(false);
      setRiderDeclinedMessage('The selected rider declined your ride request. Please choose another rider.');
      setBookingStep(BOOKING_STEP.RIDER_SELECTION);
      setSelectedRider(null);
    }
  }, [selectedRider, socket]);

  // Setup socket listeners for ride acceptance/decline
  useEffect(() => {
    if (!socket || !rideRequest?._id) return;

    // Add listeners when ride is waiting for acceptance
    if (bookingStep === BOOKING_STEP.WAITING_ACCEPTANCE) {
      socket.on('ride_accepted', handleRideAccepted);
      socket.on('ride_declined', handleRideDeclined);
    }

    return () => {
      socket.off('ride_accepted', handleRideAccepted);
      socket.off('ride_declined', handleRideDeclined);
    };
  }, [socket, rideRequest?._id, bookingStep, handleRideAccepted, handleRideDeclined]);

  // Setup socket listener for rider availability changes
  useEffect(() => {
    if (!socket) return;

    const handleRiderAvailabilityChange = (data) => {
      console.log('[BodabodaPage] Rider availability changed:', data);
      
      // Refresh nearby riders if we're in rider selection step
      if (bookingStep === BOOKING_STEP.RIDER_SELECTION && pickupLocation && dropoffLocation) {
        searchRiders(pickupLocation, dropoffLocation);
      }
    };

    socket.on('rider_availability_changed', handleRiderAvailabilityChange);

    return () => {
      socket.off('rider_availability_changed', handleRiderAvailabilityChange);
    };
  }, [socket, bookingStep, pickupLocation, dropoffLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  useEffect(() => {
    if (!socket || !rideRequest?._id) return;

    const handleRideStatusUpdate = (data) => {
      if (data?.rideId === rideRequest._id && data?.status) {
        setRideStatus(data.status);
      }
    };

    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('ride_awaiting_confirmation', handleRideStatusUpdate);

    return () => {
      socket.off('ride_status_update', handleRideStatusUpdate);
      socket.off('ride_awaiting_confirmation', handleRideStatusUpdate);
    };
  }, [socket, rideRequest?._id]);

  // Confirm ride completion (customer confirms they arrived)
  const handleConfirmRideCompletion = async () => {
    if (!rideRequest?._id) return;
    
    try {
      setLoading(true);
      await rideAPI.confirmCompletion(rideRequest._id);
      setRideStatus('completed');
      addToast('Ride completed! Payment has been released to the rider.', 'success');
      
      // Reset after a delay
      setTimeout(() => {
        handleNewRide();
      }, 3000);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to confirm ride completion', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset and start over
  const handleNewRide = () => {
    setPickupLocation(null);
    setDropoffLocation(null);
    setNearbyRiders([]);
    setSelectedRider(null);
    setRideRequest(null);
    setFareBreakdown(null);
    setEstimatedDistance(null);
    setEstimatedTime(null);
    setRouteCoordinates(null);
    setRideStatus('pending');
    setBookingStep(BOOKING_STEP.LOCATION);
    setPaymentStatus(PAYMENT_STATUS.IDLE);
    setTransactionRef(null);
    setPaymentError(null);
    setMpesaPhone('');
    setWaitingForRiderAcceptance(false);
    setRiderDeclinedMessage(null);
    setShowPaymentModal(false);
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };

  // Helper functions
  const generateMockRoute = (pickup, dropoff) => {
    if (!isValidLatLng(pickup.lat, pickup.lng) || !isValidLatLng(dropoff.lat, dropoff.lng)) {
      return [];
    }
    
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = pickup.lat + (dropoff.lat - pickup.lat) * t + (Math.random() - 0.5) * 0.005;
      const lng = pickup.lng + (dropoff.lng - pickup.lng) * t + (Math.random() - 0.5) * 0.005;
      
      if (isValidLatLng(lat, lng)) {
        points.push([lat, lng]);
      }
    }
    
    return validateRouteCoordinates(points);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Render rider selection list
  const renderRiderSelection = () => (
    <motion.div
      key="rider-selection"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bike size={24} />
            Select a Rider
          </h2>
          <p className="text-blue-100 mt-1">
            Choose a rider to see your exact fare
          </p>
        </div>

        {/* Trip Summary */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="text-green-500" size={16} />
              <span className="text-gray-600">Distance:</span>
              <span className="font-semibold">{estimatedDistance} km</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-blue-500" size={16} />
              <span className="text-gray-600">~{estimatedTime} min</span>
            </div>
          </div>
        </div>

        {/* Rider List */}
        <div className="divide-y max-h-96 overflow-y-auto">
          {nearbyRiders.map((rider) => (
            <div
              key={rider.id}
              onClick={() => selectRider(rider)}
              className="p-4 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-4"
            >
              {/* Profile Photo */}
              <div className="relative">
                {rider.avatar ? (
                  <img 
                    src={rider.avatar} 
                    alt={rider.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="text-gray-500" size={20} />
                  </div>
                )}
                {/* Online Indicator */}
                {rider.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{rider.name}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="text-yellow-400" size={14} fill="currentColor" />
                    {rider.rating?.toFixed(1) || 'New'}
                  </span>
                  <span>{rider.distance?.toFixed(1)} km away</span>
                  {rider.vehicleType && <span>• {rider.vehicleType}</span>}
                </div>
                {rider.motorcycle && (
                  <p className="text-xs text-gray-400 mt-1">
                    {rider.motorcycle.brand} {rider.motorcycle.model} • {rider.motorcycle.plateNumber}
                  </p>
                )}
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-3">
          <Button
            variant="outline"
            onClick={() => searchRiders(pickupLocation, dropoffLocation)}
            disabled={loading}
            className="flex-1"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleNewRide}
            className="flex-1"
          >
            New Search
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // Render fare summary
  const renderFareSummary = () => (
    <motion.div
      key="fare-summary"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle size={24} />
            Fare Summary
          </h2>
        </div>

        {/* Selected Rider */}
        <div className="p-4 bg-green-50 border-b">
          <p className="text-sm text-gray-500 mb-2">Selected Rider</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="text-gray-500" size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedRider?.name}</p>
              <p className="text-sm text-gray-500">
                {selectedRider?.distance?.toFixed(1)} km away • {selectedRider?.vehicleType || 'Bodaboda'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={changeRider} className="ml-auto">
              Change
            </Button>
          </div>
        </div>

        {/* Trip Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="text-green-600" size={14} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-medium text-gray-900">{pickupLocation?.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Navigation className="text-red-600" size={14} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="font-medium text-gray-900">{dropoffLocation?.name}</p>
            </div>
          </div>
        </div>

        {/* Fare Breakdown */}
        {fareBreakdown && (
          <div className="p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Fare Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium">{fareBreakdown.distanceInKm} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rate</span>
                <span className="font-medium">KSh {fareBreakdown.ratePerKm}/km {fareBreakdown.isNightRate ? '(Night)' : '(Day)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare</span>
                <span className="font-medium">KSh {fareBreakdown.baseFare?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (10%)</span>
                <span className="font-medium">KSh {fareBreakdown.platformFee?.toFixed(0)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total You Pay</span>
                  <span className="text-green-600">KSh {fareBreakdown.totalFare?.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Rider Receives</span>
                  <span>KSh {fareBreakdown.riderReceives?.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="p-4 bg-blue-50 border-t">
          <div className="flex items-start gap-3">
            <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Secure Payment</p>
              <p className="text-xs text-blue-700 mt-1">
                Your payment is held securely until the ride is completed. Rider details will be revealed after they accept your request.
              </p>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <div className="p-4">
          <Button
            fullWidth
            size="lg"
            onClick={proceedToPayment}
            disabled={loading || !fareBreakdown}
            className="text-lg"
          >
            <Phone className="mr-2" size={20} />
            Pay KSh {fareBreakdown?.totalFare?.toFixed(0)} & Book
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // Render waiting for acceptance
  const renderWaitingForAcceptance = () => (
    <motion.div
      key="waiting-acceptance"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        {waitingForRiderAcceptance ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Ride Request Sent Successfully
            </h2>
            <p className="text-gray-500 mb-2">
              Your payment has been confirmed and we've notified <strong>{selectedRider?.name}</strong> about your ride.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
              <p className="text-sm font-medium text-gray-700 mb-2">Requested Riders:</p>
              <p className="text-gray-900">{selectedRider?.name || 'Nearby Riders'}</p>
              {rideRequest?.rider?.phone && (
                <>
                  <p className="text-sm font-medium text-gray-700 mt-3 mb-1">Phone Number:</p>
                  <p className="text-gray-900 font-semibold">{rideRequest.rider.phone}</p>
                </>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-4">
              You can monitor the ride from the "My Rides" section.
            </p>
          </>
        ) : riderDeclinedMessage ? (
          <>
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Rider Declined
            </h2>
            <p className="text-gray-500 mb-4">{riderDeclinedMessage}</p>
            <p className="text-sm text-gray-400 mb-4">
              Please select another rider to continue.
            </p>
          </>
        ) : null}
        
        <div className="flex gap-3 mt-6">
          <Button
            variant="primary"
            onClick={() => navigate('/customer/rides')}
            className="flex-1"
          >
            My Rides
          </Button>
          {riderDeclinedMessage && (
            <Button
              variant="outline"
              onClick={() => {
                setRiderDeclinedMessage(null);
                setBookingStep(BOOKING_STEP.RIDER_SELECTION);
              }}
              className="flex-1"
            >
              Choose Another Rider
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Render tracking view
  const renderTracking = () => (
    <motion.div
      key="tracking"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {rideRequest?.rider ? (
        <RouteDisplay
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          riderLocation={null}
          rider={rideRequest.rider}
          routeCoordinates={routeCoordinates}
          estimatedTime={estimatedTime}
          estimatedDistance={estimatedDistance}
          estimatedPrice={fareBreakdown?.totalFare}
          rideStatus={rideStatus}
          onConfirmCompletion={handleConfirmRideCompletion}
          isLoading={loading}
          isConfirming={loading}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading...</h2>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bodaboda Transport</h1>
                <p className="text-blue-100">Fast & reliable motorcycle taxi service</p>
              </div>
            </div>
            {(bookingStep !== BOOKING_STEP.LOCATION) && (
              <Button 
                variant="outline" 
                onClick={handleNewRide} 
                className="text-white border-white hover:bg-white/20"
              >
                New Ride
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Location Selection */}
          {bookingStep === BOOKING_STEP.LOCATION && (
            <motion.div
              key="location-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-6">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => setShowLocationSelector(true)}
                  className="shadow-lg"
                >
                  <MapPin className="mr-2" size={20} />
                  Book a Ride
                </Button>
              </div>

              {pickupLocation && dropoffLocation && (
                <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Selected Locations</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pickup</p>
                        <p className="font-medium text-gray-900">{pickupLocation.name}</p>
                        <p className="text-sm text-gray-500">{pickupLocation.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Navigation className="text-red-600" size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Dropoff</p>
                        <p className="font-medium text-gray-900">{dropoffLocation.name}</p>
                        <p className="text-sm text-gray-500">{dropoffLocation.address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowLocationSelector(true)} 
                      className="flex-1"
                    >
                      Change
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => searchRiders()} 
                      className="flex-1"
                    >
                      Find Riders
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="h-64 bg-gray-100 flex items-center justify-center">
                  {userLocation ? (
                    <NearbyRidersMap
                      riders={[]}
                      userLocation={userLocation}
                      center={[userLocation.lat, userLocation.lng]}
                      zoom={13}
                      isLoading={false}
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p>Loading map...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Rider Selection */}
          {bookingStep === BOOKING_STEP.RIDER_SELECTION && renderRiderSelection()}

          {/* Fare Summary */}
          {bookingStep === BOOKING_STEP.FARE_SUMMARY && renderFareSummary()}

          {/* Waiting for Acceptance */}
          {bookingStep === BOOKING_STEP.WAITING_ACCEPTANCE && renderWaitingForAcceptance()}

          {/* Tracking */}
          {bookingStep === BOOKING_STEP.TRACKING && renderTracking()}
        </AnimatePresence>

        {/* Error Display */}
        {mapError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle size={18} />
              <p className="text-sm">{mapError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Selector Modal */}
      <Modal
        isOpen={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        size="lg"
        showCloseButton={false}
      >
        <LocationSelector
          userLocation={userLocation}
          onConfirm={handleLocationConfirm}
          onCancel={() => setShowLocationSelector(false)}
          isLoading={loading}
        />
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          if (paymentStatus === PAYMENT_STATUS.IDLE || paymentStatus === PAYMENT_STATUS.FAILED) {
            setShowPaymentModal(false);
            setPaymentError(null);
          }
        }}
        title="Pay with M-Pesa"
        size="md"
      >
        <div className="space-y-4">
          {/* Ride Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Ride Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="text-green-500" size={16} />
                <span className="text-gray-600">From:</span>
                <span className="font-medium">{pickupLocation?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="text-red-500" size={16} />
                <span className="text-gray-600">To:</span>
                <span className="font-medium">{dropoffLocation?.name}</span>
              </div>
              {estimatedDistance && (
                <div className="flex items-center gap-2 pt-2 border-t mt-2">
                  <Clock className="text-blue-500" size={16} />
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{estimatedDistance} km</span>
                </div>
              )}
              {selectedRider && (
                <div className="flex items-center gap-2 pt-2 border-t mt-2">
                  <User className="text-purple-500" size={16} />
                  <span className="text-gray-600">Rider:</span>
                  <span className="font-medium">{selectedRider.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fare Breakdown */}
          {fareBreakdown && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Fare Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance</span>
                  <span className="font-medium">{fareBreakdown.distanceInKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate</span>
                  <span className="font-medium">KSh {fareBreakdown.ratePerKm}/km {fareBreakdown.isNightRate ? '(Night)' : '(Day)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Fare</span>
                  <span className="font-medium">KSh {fareBreakdown.baseFare?.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee</span>
                  <span className="font-medium">KSh {fareBreakdown.platformFee?.toFixed(0)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>You Pay</span>
                    <span className="text-green-600">KSh {fareBreakdown.totalFare?.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Rider Receives</span>
                    <span>KSh {fareBreakdown.riderReceives?.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* M-Pesa Payment */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <Phone className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">M-Pesa</p>
                <p className="text-sm text-gray-600">Mobile Money</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  M-Pesa Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="0712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="w-full"
                  disabled={paymentStatus !== PAYMENT_STATUS.IDLE}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the M-Pesa number you'll use to pay
                </p>
              </div>
            </div>
          </div>

          {/* Payment Status Messages */}
          {paymentStatus === PAYMENT_STATUS.INITIATING && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader className="text-blue-600 animate-spin" size={20} />
                <p className="text-blue-800 font-medium">Sending STK Push...</p>
              </div>
            </div>
          )}

          {paymentStatus === PAYMENT_STATUS.WAITING && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader className="text-blue-600 animate-spin" size={20} />
                <div>
                  <p className="text-blue-800 font-medium">Waiting for payment...</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Check your phone and enter your M-Pesa PIN
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle size={18} />
                <p className="text-sm">{paymentError}</p>
              </div>
            </div>
          )}

          {/* Pay Button */}
          {paymentStatus === PAYMENT_STATUS.IDLE && (
            <Button 
              fullWidth 
              size="lg" 
              onClick={startPaymentProcess}
              disabled={loading}
            >
              Pay KSh {fareBreakdown?.totalFare?.toFixed(0)}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BodabodaPage;