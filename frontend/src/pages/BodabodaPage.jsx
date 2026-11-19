import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike,
  MapPin,
  Navigation,
  Clock,
  Phone,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
  Shield,
  User,
  Star,
  RefreshCw,
  Loader,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/Toast';
import { riderAPI, paymentAPI, rideAPI } from '../services/api';
import {
  PICKUP_OPTIONS,
  DESTINATION_OPTIONS,
  getRouteFixedFare,
  isDestinationValidForPickup,
  isNightInNairobi,
  normalizeArea,
} from '../utils/fixedFareCalculator';

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
  REVIEW: 'review',
  PAYMENT_PENDING: 'payment_pending',
  WAITING_ACCEPTANCE: 'waiting_acceptance',
  ACCEPTED: 'accepted',
};

const BodabodaPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Location selection states (predefined 4 pickups & 4 destinations)
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // Flow & data states
  const [bookingStep, setBookingStep] = useState(BOOKING_STEP.LOCATION);
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [ridersLoaded, setRidersLoaded] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [rideRequest, setRideRequest] = useState(null);
  const [rideStatus, setRideStatus] = useState('pending');

  // Payment states
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '');
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.IDLE);
  const [paymentError, setPaymentError] = useState(null);
  const [transactionRef, setTransactionRef] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Rider acceptance states
  const [riderDeclinedMessage, setRiderDeclinedMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const riderFetchSequence = useRef(0);
  const pickupCoordinatesRef = useRef(null);

  // Pre-fill phone number when user profile loads
  useEffect(() => {
    if (user?.phone && !mpesaPhone) {
      setMpesaPhone(user.phone);
    }
  }, [user?.phone, mpesaPhone]);

  // Handle optional query parameter ?dest=... from quick links
  useEffect(() => {
    const destParam = searchParams.get('dest');
    if (destParam) {
      const canonical = normalizeArea(destParam);
      if (canonical) {
        setSelectedDestination(`Around ${canonical}`);
      }
    }
    const pickupParam = searchParams.get('pickup');
    if (pickupParam) {
      const canonical = normalizeArea(pickupParam);
      if (canonical) {
        setSelectedPickup(canonical);
      }
    }
  }, [searchParams]);

  // Calculate fixed fare preview automatically whenever pickup or destination changes
  const farePreview = useMemo(() => {
    if (!selectedPickup || !selectedDestination) return null;
    return getRouteFixedFare(selectedPickup, selectedDestination);
  }, [selectedPickup, selectedDestination]);

  const isRouteSupported = useMemo(() => {
    if (!selectedPickup || !selectedDestination) return true;
    return isDestinationValidForPickup(selectedPickup, selectedDestination);
  }, [selectedPickup, selectedDestination]);

  const rideAlreadyPaid = rideRequest?.paymentStatus === 'paid' &&
    ['declined', 'no_rider_available'].includes(rideRequest?.status);

  // Fetch available riders for selected pickup location directly from database
  const fetchAvailableRiders = useCallback(async (pickup) => {
    if (!pickup) return;
    const requestId = ++riderFetchSequence.current;

    try {
      setLoadingRiders(true);
      setRidersLoaded(false);

      const response = await riderAPI.getNearbyRiders({ pickup });

      if (requestId !== riderFetchSequence.current) return;

      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        throw new Error(response.data?.message || 'Rider search returned an invalid response.');
      }

      setNearbyRiders(response.data.data);
      setRidersLoaded(true);
    } catch (error) {
      console.error('[BodabodaPage] Failed to fetch riders:', error);
      if (requestId === riderFetchSequence.current) {
        setNearbyRiders([]);
        setRidersLoaded(true);
      }
    } finally {
      if (requestId === riderFetchSequence.current) {
        setLoadingRiders(false);
      }
    }
  }, []);

  // Auto-fetch riders once both pickup and destination are selected and route is valid
  useEffect(() => {
    if (selectedPickup && selectedDestination && isRouteSupported) {
      fetchAvailableRiders(selectedPickup);
    }
  }, [selectedPickup, selectedDestination, isRouteSupported, fetchAvailableRiders]);

  useEffect(() => {
    if (bookingStep !== BOOKING_STEP.RIDER_SELECTION || !selectedPickup) return undefined;
    const refreshInterval = setInterval(() => fetchAvailableRiders(selectedPickup), 15000);
    return () => clearInterval(refreshInterval);
  }, [bookingStep, selectedPickup, fetchAvailableRiders]);

  // Handler for selecting a pickup
  const handleSelectPickup = (pickupId) => {
    riderFetchSequence.current += 1;
    setLoadingRiders(false);
    setSelectedPickup(pickupId);
    pickupCoordinatesRef.current = null;
    setPickupCoordinates(null);
    setSelectedRider(null);
    setNearbyRiders([]);
    setRidersLoaded(false);
  };

  // Handler for selecting a destination
  const handleSelectDestination = (destId) => {
    riderFetchSequence.current += 1;
    setLoadingRiders(false);
    setSelectedDestination(destId);
    setSelectedRider(null);
    setNearbyRiders([]);
    setRidersLoaded(false);
  };

  // Proceed to rider selection view or scroll down
  const handleProceedToRiders = () => {
    if (!selectedPickup || !selectedDestination || !farePreview) {
      addToast('Please select both pickup and destination.', 'error');
      return;
    }
    if (!isRouteSupported) {
      addToast('This route combination is currently not supported.', 'error');
      return;
    }
    setBookingStep(BOOKING_STEP.RIDER_SELECTION);
    fetchAvailableRiders(selectedPickup);
  };

  // Select a rider and proceed to review
  const handleSelectRider = (rider) => {
    if (!ridersLoaded || loadingRiders || !nearbyRiders.some(
      (available) => (available._id || available.id) === (rider._id || rider.id)
    )) {
      addToast('Please select a currently available rider.', 'error');
      return;
    }
    setSelectedRider(rider);
    setBookingStep(BOOKING_STEP.REVIEW);
  };

  // Change rider
  const handleChangeRider = () => {
    setSelectedRider(null);
    setBookingStep(BOOKING_STEP.RIDER_SELECTION);
  };

  // Format phone number to clean Kenyan format
  const formatKenyanPhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  // Start M-Pesa STK Push
  const handleStartPayment = async () => {
    if (!user) {
      navigate('/login?redirect=/transport');
      return;
    }

    if (user.role !== 'customer') {
      addToast('Please log in with a customer account to book rides.', 'error');
      return;
    }

    const riderIsLoaded = nearbyRiders.some(
      (rider) => (rider._id || rider.id) === (selectedRider?._id || selectedRider?.id)
    );
    if (!selectedPickup || !selectedDestination || !farePreview || !ridersLoaded || loadingRiders || !selectedRider || !riderIsLoaded) {
      addToast('Please complete pickup, destination and rider selection.', 'error');
      return;
    }

    if (!rideAlreadyPaid && (!mpesaPhone || !mpesaPhone.trim())) {
      setPaymentError('Please enter your M-Pesa phone number.');
      return;
    }

    const cleanedPhone = formatKenyanPhone(mpesaPhone);
    if (!rideAlreadyPaid && !/^254[17]\d{8}$/.test(cleanedPhone)) {
      setPaymentError('Enter a valid Kenyan M-Pesa number (e.g. 0712345678 or 0112345678).');
      return;
    }

    try {
      setActionLoading(true);
      setPaymentError(null);
      if (rideAlreadyPaid) {
        const response = await rideAPI.reassign(
          rideRequest._id,
          selectedRider._id || selectedRider.id
        );
        setRideRequest(response.data.data);
        setRideStatus('waiting_rider');
        setRiderDeclinedMessage(null);
        setBookingStep(BOOKING_STEP.WAITING_ACCEPTANCE);
        addToast(`Ride request sent to ${selectedRider.name}. No additional payment was taken.`, 'success');
        return;
      }

      setPaymentStatus(PAYMENT_STATUS.INITIATING);
      setShowPaymentModal(true);

      const payload = {
        pickup: selectedPickup,
        destination: selectedDestination,
        pickupLocation: {
          name: selectedPickup,
          address: selectedPickup,
          ...(pickupCoordinates && {
            coordinates: [pickupCoordinates.longitude, pickupCoordinates.latitude],
          }),
        },
        dropoffLocation: {
          name: selectedDestination,
          address: selectedDestination,
        },
        phoneNumber: cleanedPhone,
        riderId: selectedRider._id || selectedRider.id,
      };

      const response = await paymentAPI.initiateWithRider(payload);

      if (response.data.success) {
        const { transactionRef: ref } = response.data.data;
        setTransactionRef(ref);
        setPaymentStatus(PAYMENT_STATUS.WAITING);
        startPaymentPolling(ref);
      } else {
        throw new Error(response.data.message || 'Payment initiation failed.');
      }
    } catch (err) {
      console.error('[handleStartPayment] Error:', err);
      if (!rideAlreadyPaid) setPaymentStatus(PAYMENT_STATUS.FAILED);
      setPaymentError(err.response?.data?.message || err.message || 'Payment initiation failed.');
      if (rideAlreadyPaid) fetchAvailableRiders(selectedPickup);
    } finally {
      setActionLoading(false);
    }
  };

  // Poll for payment confirmation
  const startPaymentPolling = useCallback((ref) => {
    if (pollingInterval) clearInterval(pollingInterval);

    const interval = setInterval(async () => {
      try {
        const response = await paymentAPI.verify(ref);
        if (response.data.success) {
          const { status, rideRequest: createdRide } = response.data.data;

          if (status === 'SUCCESS' || status === 'paid') {
            clearInterval(interval);
            setPaymentStatus(PAYMENT_STATUS.SUCCESS);
            setShowPaymentModal(false);

            if (createdRide) {
              setRideRequest(createdRide);
            }
            if (createdRide?.status === 'no_rider_available') {
              setSelectedRider(null);
              setRiderDeclinedMessage('Your selected rider is unavailable. Choose another available rider; your payment is already confirmed.');
              setBookingStep(BOOKING_STEP.RIDER_SELECTION);
              addToast('Payment confirmed, but the selected rider is unavailable. Choose another rider without paying again.', 'info');
            } else {
              setBookingStep(BOOKING_STEP.WAITING_ACCEPTANCE);
              addToast('M-Pesa payment confirmed! Rider has been notified.', 'success');
            }
          } else if (status === 'FAILED' || status === 'CANCELLED') {
            clearInterval(interval);
            setPaymentStatus(PAYMENT_STATUS.FAILED);
            setPaymentError(status === 'CANCELLED' ? 'M-Pesa request was cancelled.' : 'M-Pesa payment failed.');
          }
        }
      } catch (err) {
        console.error('[startPaymentPolling] Poll error:', err);
      }
    }, 3000);

    setPollingInterval(interval);

    // Timeout polling after 4 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (paymentStatus === PAYMENT_STATUS.WAITING) {
        setPaymentStatus(PAYMENT_STATUS.FAILED);
        setPaymentError('Payment verification timed out. If money was deducted, check My Rides.');
      }
    }, 4 * 60 * 1000);
  }, [pollingInterval, paymentStatus, addToast]);

  // Clean up polling interval
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  // Socket listeners for ride acceptance, decline, and status updates
  useEffect(() => {
    if (!socket) return;

    const handleRideAccepted = (data) => {
      console.log('[BodabodaPage] Ride accepted by rider:', data);
      if (data.rideId === rideRequest?._id || data.riderId === selectedRider?._id || data.riderId === selectedRider?.id) {
        setRideStatus('accepted');
        setBookingStep(BOOKING_STEP.ACCEPTED);
        if (data.riderName) {
          addToast(`${data.riderName} accepted your ride request!`, 'success');
        }
        setRideRequest((prev) => ({
          ...prev,
          rider: {
            _id: data.riderId,
            name: data.riderName,
            phone: data.riderPhone,
            motorcycle: data.riderProfile?.motorcycle,
          },
          status: 'accepted',
        }));
      }
    };

    const handleRideDeclined = (data) => {
      console.log('[BodabodaPage] Ride declined:', data);
      if (data?.rideId !== rideRequest?._id) return;
      setRiderDeclinedMessage(data.reason ? `Rider declined: "${data.reason}". Please choose another rider.` : 'The selected rider declined your request. Please choose another rider.');
      setRideRequest((previous) => previous ? { ...previous, status: 'declined' } : previous);
      setBookingStep(BOOKING_STEP.RIDER_SELECTION);
      setSelectedRider(null);
      fetchAvailableRiders(selectedPickup);
    };

    const handleRiderUnavailable = (data) => {
      if (data?.rideId !== rideRequest?._id) return;
      setRiderDeclinedMessage(data.message || 'Your selected rider is unavailable. Choose another rider without paying again.');
      setRideRequest((previous) => previous ? { ...previous, status: 'no_rider_available' } : previous);
      setBookingStep(BOOKING_STEP.RIDER_SELECTION);
      setSelectedRider(null);
      fetchAvailableRiders(selectedPickup);
    };

    const handleRideStatusUpdate = (data) => {
      if (data?.rideId === rideRequest?._id) {
        setRideStatus(data.status);
      }
    };

    const handleRiderAvailabilityChanged = (data) => {
      console.log('[BodabodaPage] Real-time rider availability changed:', data);
      if (selectedPickup) {
        fetchAvailableRiders(selectedPickup);
      }
    };

    socket.on('ride_accepted', handleRideAccepted);
    socket.on('ride_declined', handleRideDeclined);
    socket.on('ride_rider_unavailable', handleRiderUnavailable);
    socket.on('ride_request_expired', handleRiderUnavailable);
    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('rider_availability_changed', handleRiderAvailabilityChanged);

    return () => {
      socket.off('ride_accepted', handleRideAccepted);
      socket.off('ride_declined', handleRideDeclined);
      socket.off('ride_rider_unavailable', handleRiderUnavailable);
      socket.off('ride_request_expired', handleRiderUnavailable);
      socket.off('ride_status_update', handleRideStatusUpdate);
      socket.off('rider_availability_changed', handleRiderAvailabilityChanged);
    };
  }, [socket, rideRequest?._id, selectedRider, selectedPickup, addToast, fetchAvailableRiders]);

  // Customer confirms ride arrival/completion
  const handleConfirmCompletion = async () => {
    if (!rideRequest?._id) return;
    try {
      setActionLoading(true);
      await rideAPI.confirmCompletion(rideRequest._id);
      setRideStatus('completed');
      addToast('Ride marked as completed. Funds released to rider.', 'success');
      setTimeout(() => {
        navigate('/customer/rides');
      }, 2000);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to confirm ride completion.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset entire workflow for a new ride
  const handleResetRide = () => {
    riderFetchSequence.current += 1;
    if (pollingInterval) clearInterval(pollingInterval);
    setSelectedPickup(null);
    setSelectedDestination(null);
    setSelectedRider(null);
    setNearbyRiders([]);
    setLoadingRiders(false);
    setRidersLoaded(false);
    setRideRequest(null);
    setBookingStep(BOOKING_STEP.LOCATION);
    setPaymentStatus(PAYMENT_STATUS.IDLE);
    setPaymentError(null);
    setTransactionRef(null);
    setRiderDeclinedMessage(null);
    setShowPaymentModal(false);
  };

  const isNight = isNightInNairobi();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24">
      {/* Brand Hero Header */}
      <section className="bg-gradient-to-b from-[#111827] to-slate-900 border-b border-slate-800 pt-8 pb-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5E00]/20 border border-[#FF5E00]/40 flex items-center justify-center text-[#FF5E00] shadow-lg shadow-[#FF5E00]/10">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    OLAFasta Boda
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FF5E00] text-white">
                    Fixed Fare
                  </span>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                  Predefined pickup & dropoff spots with zero map hassle
                </p>
              </div>
            </div>

            {bookingStep !== BOOKING_STEP.LOCATION && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetRide}
                className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw size={14} className="mr-1.5" />
                New Ride
              </Button>
            )}
          </div>

          {/* Timezone & Fare Banner */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              {isNight ? (
                <Moon className="w-4 h-4 text-purple-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-slate-300">
                Current Time:{' '}
                <strong className="text-white">
                  {new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })} EAT
                </strong>{' '}
                ({isNight ? 'Night Pricing: +KSh 20' : 'Day Pricing: Standard'})
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Day (5:00 AM – 7:59 PM) • Night (8:00 PM – 4:59 AM)
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* STEP 1 to 4: LOCATION SELECTION & LIVE FARE PREVIEW */}
          {bookingStep === BOOKING_STEP.LOCATION && (
            <motion.div
              key="step-locations"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {riderDeclinedMessage && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Ride Update</p>
                    <p className="text-xs text-amber-300/90 mt-0.5">{riderDeclinedMessage}</p>
                  </div>
                </div>
              )}

              {/* Step 2: Predefined Pickup Locations */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white">
                        Select Pickup Location
                      </h2>
                      <p className="text-slate-400 text-xs">Where are you taking the boda from?</p>
                    </div>
                  </div>
                  {selectedPickup && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ {selectedPickup}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PICKUP_OPTIONS.map((spot) => {
                    const isSelected = selectedPickup === spot.id;
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => handleSelectPickup(spot.id)}
                        className={`relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FF5E00]/15 border-[#FF5E00] ring-2 ring-[#FF5E00]/40 shadow-lg'
                            : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <MapPin
                            size={18}
                            className={isSelected ? 'text-[#FF5E00]' : 'text-slate-400'}
                          />
                          {isSelected && (
                            <CheckCircle size={14} className="text-[#FF5E00]" />
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm sm:text-base text-white">
                            {spot.label}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {spot.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Predefined Destination Areas */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white">
                        Select Destination Area
                      </h2>
                      <p className="text-slate-400 text-xs">Where do you want to be dropped off?</p>
                    </div>
                  </div>
                  {selectedDestination && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      ✓ {selectedDestination}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DESTINATION_OPTIONS.map((dest) => {
                    const isSelected = selectedDestination === dest.id;
                    const isValid = selectedPickup
                      ? isDestinationValidForPickup(selectedPickup, dest.id)
                      : true;

                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => handleSelectDestination(dest.id)}
                        className={`relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FF5E00]/15 border-[#FF5E00] ring-2 ring-[#FF5E00]/40 shadow-lg'
                            : isValid
                            ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                            : 'bg-slate-800/40 border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <Navigation
                            size={18}
                            className={isSelected ? 'text-[#FF5E00]' : 'text-slate-400'}
                          />
                          {isSelected && (
                            <CheckCircle size={14} className="text-[#FF5E00]" />
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm sm:text-base text-white">
                            {dest.label}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {dest.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Display Fare Automatically */}
              {selectedPickup && selectedDestination && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900 border border-[#FF5E00]/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5E00]/10 rounded-full blur-3xl pointer-events-none" />

                  {isRouteSupported && farePreview ? (
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
                            <Sparkles size={12} /> Official Fixed Fare
                          </span>
                          <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
                            <span>{farePreview.pickup}</span>
                            <ArrowRight size={16} className="text-[#FF5E00]" />
                            <span>{farePreview.destination}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs text-slate-400">Total Ride Fare</p>
                          <p className="text-3xl sm:text-4xl font-black text-[#FF5E00]">
                            KSh {farePreview.totalFare}
                          </p>
                        </div>
                      </div>

                      {/* Pricing Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-slate-400">Pickup</p>
                          <p className="font-bold text-white mt-0.5">{farePreview.pickup}</p>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-slate-400">Destination</p>
                          <p className="font-bold text-white mt-0.5">{farePreview.destination}</p>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-slate-400">Fare Type</p>
                          <p className="font-bold text-white mt-0.5 capitalize flex items-center gap-1">
                            {farePreview.fareType === 'night' ? (
                              <Moon size={12} className="text-purple-400" />
                            ) : (
                              <Sun size={12} className="text-amber-400" />
                            )}
                            {farePreview.fareType} {farePreview.fareType === 'night' ? '(+KSh 20)' : ''}
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-slate-400">Pricing Guarantee</p>
                          <p className="font-bold text-emerald-400 mt-0.5">Fixed Fare</p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Shield size={14} className="text-emerald-400" />
                          No surge pricing. No distance meter. Authoritative fixed rates.
                        </p>
                        <Button
                          size="lg"
                          onClick={handleProceedToRiders}
                          className="w-full sm:w-auto bg-[#FF5E00] hover:bg-orange-600 text-white font-bold px-8 shadow-lg shadow-[#FF5E00]/20"
                        >
                          Find Available Riders
                          <ArrowRight size={16} className="ml-2" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-amber-300">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                      <p className="font-bold text-sm">Route Combination Unsupported</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        A direct fixed fare between {selectedPickup} and {selectedDestination} is not defined in the official fare matrix. Please choose an adjacent destination area.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 5: SELECT AN AVAILABLE RIDER */}
          {bookingStep === BOOKING_STEP.RIDER_SELECTION && (
            <motion.div
              key="step-riders"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Trip Header Summary */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Your Route</p>
                  <div className="flex items-center gap-2 text-base font-extrabold text-white mt-1">
                    <span>{selectedPickup}</span>
                    <ArrowRight size={14} className="text-[#FF5E00]" />
                    <span>{selectedDestination}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Fixed {farePreview?.fareType} Fare: <strong className="text-emerald-400">KSh {farePreview?.totalFare}</strong>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBookingStep(BOOKING_STEP.LOCATION)}
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Change Route
                </Button>
              </div>

              {/* Riders List */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bike className="text-[#FF5E00]" size={20} />
                      Available Boda Riders
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {pickupCoordinates
                        ? 'Sorted by live distance from your GPS pickup'
                        : 'Select a verified rider in your pickup area; GPS distance is unavailable'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAvailableRiders(selectedPickup)}
                    disabled={loadingRiders}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    <RefreshCw size={12} className={`mr-1.5 ${loadingRiders ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {loadingRiders ? (
                  <div className="py-16 text-center">
                    <Loader className="w-8 h-8 text-[#FF5E00] animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold text-white">Loading nearby riders...</p>
                    <p className="text-xs text-slate-400 mt-1">Checking active boda riders around {selectedPickup}</p>
                  </div>
                ) : nearbyRiders.length === 0 ? (
                  <div className="py-14 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-6">
                    <Bike className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No Active Riders Right Now</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                      All riders in {selectedPickup} are currently offline or on a trip. Tap refresh in a moment to check for newly available riders.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAvailableRiders(selectedPickup)}
                      className="text-slate-300 border-slate-700 hover:bg-slate-800"
                    >
                      <RefreshCw size={12} className="mr-1.5" />
                      Check Again
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nearbyRiders.map((rider) => (
                      <div
                        key={rider._id || rider.id}
                        className={`bg-slate-900/80 border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group ${
                          (selectedRider?._id || selectedRider?.id) === (rider._id || rider.id)
                            ? 'border-[#FF5E00] ring-2 ring-[#FF5E00]/30'
                            : 'border-slate-700 hover:border-[#FF5E00]/60'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 mb-4">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                            {rider.avatar || rider.profilePhoto ? (
                              <img
                                src={rider.avatar || rider.profilePhoto}
                                alt={rider.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                {rider.name?.charAt(0) || 'R'}
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-[#FF5E00] transition-colors">
                              {rider.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1 text-amber-400 font-bold">
                                <Star size={12} className="fill-current" />
                                {rider.rating ? rider.rating.toFixed(1) : '5.0'}
                              </span>
                              <span>•</span>
                              <span>{rider.totalTrips || 0} trips</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-1">
                              🏍️ {rider.motorcycle?.brand || rider.vehicleType || 'Boda Boda'}
                              {(rider.registrationNumber || rider.motorcycle?.plateNumber)
                                ? ` (${rider.registrationNumber || rider.motorcycle.plateNumber})`
                                : ''}
                            </p>
                            <p className="text-[10px] text-emerald-400 mt-1">Online · Available</p>
                          </div>
                        </div>

                        {rider.motorcycle?.photo && (
                          <img
                            src={rider.motorcycle.photo}
                            alt={`${rider.name}'s motorcycle`}
                            className="w-full h-24 object-cover rounded-xl mb-3"
                          />
                        )}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                          <span>
                            {rider.distance !== null && rider.distance !== undefined && Number.isFinite(Number(rider.distance))
                              ? `${rider.distance} km away`
                              : 'Distance unavailable'}
                          </span>
                          <span>
                            {rider.estimatedArrival !== null && rider.estimatedArrival !== undefined
                              ? `~${rider.estimatedArrival} min away`
                              : 'ETA unavailable'}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Fixed Fare</span>
                            <span className="text-base font-black text-emerald-400">
                              KSh {farePreview?.totalFare}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSelectRider(rider)}
                            className="bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-xs px-4"
                          >
                            Select Rider
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 6 & 7: REVIEW BOOKING & M-PESA PAYMENT */}
          {bookingStep === BOOKING_STEP.REVIEW && (
            <motion.div
              key="step-review"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={20} />
                    {rideAlreadyPaid ? 'Confirm New Rider' : 'Review Booking & Pay'}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangeRider}
                    className="text-xs text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    Change Rider
                  </Button>
                </div>

                {/* Selected Rider Details */}
                <div className="py-4 border-b border-slate-700 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold">
                    {selectedRider?.avatar || selectedRider?.profilePhoto ? (
                      <img
                        src={selectedRider.avatar || selectedRider.profilePhoto}
                        alt={selectedRider.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedRider?.name?.charAt(0) || 'R'
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Assigned Rider</p>
                    <p className="font-bold text-white text-base">{selectedRider?.name}</p>
                    <p className="text-xs text-slate-400">
                      {selectedRider?.motorcycle?.brand || selectedRider?.vehicleType || 'Boda Boda'}
                      {selectedRider?.motorcycle?.plateNumber ? ` • ${selectedRider.motorcycle.plateNumber}` : ''}
                    </p>
                  </div>
                </div>

                {/* Route Summary */}
                <div className="py-4 border-b border-slate-700 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-400" />
                      Pickup Area:
                    </span>
                    <span className="font-bold text-white">{selectedPickup}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Navigation size={16} className="text-blue-400" />
                      Destination Area:
                    </span>
                    <span className="font-bold text-white">{selectedDestination}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Clock size={16} className="text-purple-400" />
                      Fare Type:
                    </span>
                    <span className="font-bold text-white capitalize">
                      {farePreview?.fareType} {farePreview?.fareType === 'night' ? '(Night Surcharge +KSh 20)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Shield size={16} className="text-emerald-400" />
                      Pricing System:
                    </span>
                    <span className="font-bold text-emerald-400">Official Fixed Fare</span>
                  </div>
                </div>

                {/* Total Fare Amount */}
                <div className="py-4 border-b border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      {rideAlreadyPaid ? 'Already Paid' : 'Amount to Pay'}
                    </span>
                    <p className="text-xs text-slate-500">
                      {rideAlreadyPaid ? 'No additional payment required' : 'M-Pesa STK Push direct'}
                    </p>
                  </div>
                  <span className="text-3xl font-black text-[#FF5E00]">
                    KSh {farePreview?.totalFare}
                  </span>
                </div>

                {/* M-Pesa Phone Input */}
                <div className="pt-4 space-y-3">
                  {!rideAlreadyPaid && (
                    <>
                      <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider">
                        M-Pesa Phone Number
                      </label>
                      <Input
                        type="tel"
                        placeholder="0712345678"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        className="w-full bg-slate-900 border-slate-700 text-white placeholder-slate-500 font-mono text-base"
                      />
                      <p className="text-[11px] text-slate-400">
                        Enter the Safaricom number where you will enter your M-Pesa PIN.
                      </p>
                    </>
                  )}

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleStartPayment}
                    disabled={
                      actionLoading ||
                      !farePreview ||
                      !ridersLoaded ||
                      loadingRiders ||
                      !nearbyRiders.some(
                        (rider) => (rider._id || rider.id) === (selectedRider?._id || selectedRider?.id)
                      )
                    }
                    className="mt-2 bg-[#FF5E00] hover:bg-orange-600 text-white font-extrabold text-base py-3.5 shadow-lg shadow-[#FF5E00]/25"
                  >
                    {actionLoading ? (
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Phone className="w-5 h-5 mr-2" />
                    )}
                    {rideAlreadyPaid
                      ? 'Send Paid Request to Selected Rider'
                      : `Pay KSh ${farePreview?.totalFare} & Book`}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 8: WAITING FOR RIDER ACCEPTANCE */}
          {bookingStep === BOOKING_STEP.WAITING_ACCEPTANCE && (
            <motion.div
              key="step-waiting"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto text-center bg-slate-800/80 border border-slate-700 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Payment Confirmed!</h2>
              <p className="text-xs text-slate-400 mb-6">
                Your payment of <strong>KSh {farePreview?.totalFare}</strong> is held safely in escrow. We have notified <strong>{selectedRider?.name}</strong> to accept your ride.
              </p>

              <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 text-left space-y-2 mb-6 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Rider:</span>
                  <span className="font-bold text-white">{selectedRider?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pickup Area:</span>
                  <span className="font-bold text-white">{selectedPickup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-bold text-white">{selectedDestination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fixed Fare:</span>
                  <span className="font-bold text-emerald-400">KSh {farePreview?.totalFare}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-amber-400 mb-6">
                <Loader size={14} className="animate-spin" />
                <span>Waiting for rider to accept...</span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate('/customer/rides')}
                  className="bg-[#FF5E00] hover:bg-orange-600 text-white font-bold"
                >
                  View My Rides
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleResetRide}
                  className="text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}

          {/* RIDER ACCEPTED VIEW */}
          {bookingStep === BOOKING_STEP.ACCEPTED && (
            <motion.div
              key="step-accepted"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-lg mx-auto bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Bike size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Rider on the Way!</h2>
              <p className="text-xs text-slate-400 mb-6">
                <strong>{rideRequest?.rider?.name || selectedRider?.name}</strong> has accepted your ride request.
              </p>

              <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 text-left space-y-3 mb-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <p className="text-xs text-slate-400">Rider Contact</p>
                    <p className="font-extrabold text-white text-base">
                      {rideRequest?.rider?.name || selectedRider?.name}
                    </p>
                  </div>
                  {rideRequest?.rider?.phone && (
                    <a
                      href={`tel:${rideRequest.rider.phone}`}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Phone size={14} /> Call Rider
                    </a>
                  )}
                </div>

                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pickup Area:</span>
                    <span className="font-bold text-white">{selectedPickup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination Area:</span>
                    <span className="font-bold text-white">{selectedDestination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fixed Fare Paid:</span>
                    <span className="font-bold text-emerald-400">KSh {farePreview?.totalFare}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ride Status:</span>
                    <span className="font-bold text-blue-400 uppercase tracking-wider">{rideStatus}</span>
                  </div>
                </div>
              </div>

              {rideStatus === 'awaiting_customer_confirmation' && (
                <div className="mb-6">
                  <p className="text-xs text-amber-300 mb-2">
                    The rider has indicated arrival at your destination.
                  </p>
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleConfirmCompletion}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Confirm Safe Arrival
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate('/customer/rides')}
                  className="bg-[#FF5E00] hover:bg-orange-600 text-white font-bold"
                >
                  My Rides History
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleResetRide}
                  className="text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  New Ride
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* M-Pesa STK Push Waiting Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          if (paymentStatus !== PAYMENT_STATUS.WAITING && paymentStatus !== PAYMENT_STATUS.INITIATING) {
            setShowPaymentModal(false);
          }
        }}
        size="md"
        title="M-Pesa STK Push"
      >
        <div className="text-center py-4 space-y-4">
          {paymentStatus === PAYMENT_STATUS.INITIATING && (
            <div className="space-y-3">
              <Loader className="w-12 h-12 text-[#FF5E00] animate-spin mx-auto" />
              <h3 className="font-bold text-gray-900 text-base">Sending M-Pesa Prompt...</h3>
              <p className="text-xs text-gray-500">Connecting to Safaricom Daraja Gateway</p>
            </div>
          )}

          {paymentStatus === PAYMENT_STATUS.WAITING && (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                <Phone size={28} />
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg">Check Your Phone</h3>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">
                An STK Push for <strong>KSh {farePreview?.totalFare}</strong> was sent to your phone. Enter your M-Pesa PIN to complete payment.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                <Loader size={12} className="animate-spin" />
                Listening for confirmed payment...
              </div>
            </div>
          )}

          {paymentStatus === PAYMENT_STATUS.FAILED && (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Payment Not Completed</h3>
              <p className="text-xs text-red-600 max-w-xs mx-auto">
                {paymentError || 'The M-Pesa request failed or was cancelled.'}
              </p>
              <Button
                variant="primary"
                onClick={() => setShowPaymentModal(false)}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BodabodaPage;
