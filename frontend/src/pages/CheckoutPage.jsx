import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  Package,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RefreshCw,
  Zap,
  Lock,
  Truck,
  Sparkles,
} from 'lucide-react';
import { calculatePayment, formatCurrency } from '../utils/paymentCalculator';

const CAMPUS_LANDMARKS = [
  { id: 'kesses', label: 'Kesses', icon: '🏫', desc: 'Main Campus Gate' },
  { id: 'stage', label: 'Stage', icon: '🚏', desc: 'Matatu & Boda Stage' },
  { id: 'mabs', label: 'Mabs', icon: '🍔', desc: 'Moi University Mabs' },
  { id: 'chebarus', label: 'Chebarus', icon: '📍', desc: 'Chebarus Center' },
  { id: 'hostels', label: 'Hostels', icon: '🏢', desc: 'Internal / Private' },
];

const CheckoutPage = () => {
  const params = useParams();
  const { entityType, entityId } = params;
  const navigate = useNavigate();
  const location = useLocation();
  const directCheckout = location.state?.directPurchase ? location.state : null;
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '');
  const [phoneError, setPhoneError] = useState('');

  const [deliveryInfo, setDeliveryInfo] = useState({
    phone: user?.phone || '',
    address: '',
    neighborhood: 'Stage',
    landmark: 'Stage',
  });

  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [pollingTimeout, setPollingTimeout] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentFailureMessage, setPaymentFailureMessage] = useState('');

  const [countdown, setCountdown] = useState(60);
  const countdownTimerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Pre-fill delivery and phone from user profile
  useEffect(() => {
    if (user) {
      setDeliveryInfo((prev) => ({
        ...prev,
        phone: prev.phone || user.phone || '',
        neighborhood: prev.neighborhood || user.campusLocation || 'Stage',
        landmark: prev.landmark || user.campusLocation || 'Stage',
      }));
      if (user.phone && !mpesaPhone) {
        setMpesaPhone(user.phone);
      }
    }
  }, [user]);

  // STK Push Countdown Timer
  useEffect(() => {
    if (paymentInitiated && !paymentSuccess && !paymentFailed) {
      setCountdown(60);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownTimerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [paymentInitiated, paymentSuccess, paymentFailed]);

  const formatPhoneNumber = useCallback((phone) => {
    let cleaned = String(phone || '').replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 9 && /^[7891]/.test(cleaned)) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  }, []);

  const validatePhoneNumber = useCallback(
    (phone) => {
      const formatted = formatPhoneNumber(phone);
      const regex = /^254(7|8|9|1)\d{8}$/;
      return regex.test(formatted);
    },
    [formatPhoneNumber]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    setMpesaPhone(e.target.value);
    setPhoneError('');
  };

  const handleSelectLandmark = (landmarkLabel) => {
    setDeliveryInfo((prev) => ({
      ...prev,
      neighborhood: landmarkLabel,
      landmark: landmarkLabel,
    }));
  };

  const mapMpesaFailureReason = useCallback((resultCode, backendStatus) => {
    const rcNumber = Number(resultCode);
    if (backendStatus === 'failed') return 'Insufficient balance or request cancelled';
    switch (rcNumber) {
      case 1:
        return 'Insufficient M-Pesa balance for this transaction';
      case 1032:
        return 'You cancelled the transaction request on your phone';
      case 1037:
        return 'STK prompt timed out or phone was unreachable';
      case 2001:
        return 'Invalid M-Pesa PIN entered';
      case 9999:
        return 'General M-Pesa system failure. Please try again';
      default:
        return 'Payment was not completed. Please try again';
    }
  }, []);

  // Fetch real order details or prepare cart / direct checkout
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);

        // Cart-based or direct purchase checkout
        if (!entityType && !entityId) {
          if (directCheckout) {
            const directItems = directCheckout.directItems || [];
            if (directItems.length === 0) {
              setOrderDetails(null);
              setError('No product was selected for checkout.');
              return;
            }

            const baseAmount = directItems.reduce(
              (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
              0
            );
            const deliveryFee = 0;
            const paymentBreakdown = calculatePayment(baseAmount, deliveryFee);
            setOrderDetails({
              entityType: 'cart',
              isDirectPurchase: true,
              baseAmount,
              deliveryFee,
              platformFee: paymentBreakdown.platformFee,
              customerShare: paymentBreakdown.customerShare,
              providerShare: paymentBreakdown.providerShare,
              customerPays: paymentBreakdown.customerPays,
              providerReceives: paymentBreakdown.providerReceives,
              platformReceives: paymentBreakdown.platformReceives,
              items: directItems,
            });
            return;
          }

          if (cartItems.length === 0) {
            if (paymentSuccess && orderDetails) {
              setLoading(false);
              return;
            }
            setOrderDetails(null);
            setLoading(false);
            return;
          }

          const deliveryFee = 0;
          const paymentBreakdown = calculatePayment(cartTotal, deliveryFee);

          setOrderDetails({
            entityType: 'cart',
            baseAmount: cartTotal,
            deliveryFee,
            platformFee: paymentBreakdown.platformFee,
            customerShare: paymentBreakdown.customerShare,
            providerShare: paymentBreakdown.providerShare,
            customerPays: paymentBreakdown.customerPays,
            providerReceives: paymentBreakdown.providerReceives,
            platformReceives: paymentBreakdown.platformReceives,
            items: cartItems.map((item) => {
              const addOnsTotal = (item.selectedAddOns || []).reduce(
                (s, a) => s + (Number(a.price) || 0),
                0
              );
              return {
                name: item.name,
                price: (item.price || 0) + addOnsTotal,
                quantity: item.quantity,
                images: item.images || (item.image ? [item.image] : []),
                product: item._id,
                variant:
                  item.variant ||
                  (item.selectedOptions
                    ? Object.entries(item.selectedOptions)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')
                    : ''),
                variantId: item.variantId || undefined,
                selectedOptions: item.selectedOptions || {},
                selectedAddOns: item.selectedAddOns || [],
                addOnsTotal,
              };
            }),
          });
          return;
        }

        // Specific entity checkout (order, rental, ride)
        let response;
        if (entityType === 'order') response = await api.get(`/orders/${entityId}`);
        else if (entityType === 'rental') response = await api.get(`/rentals/${entityId}`);
        else if (entityType === 'ride') response = await api.get(`/rides/${entityId}`);
        else {
          setError('Invalid entity type');
          return;
        }

        if (response.data.success || response.data.data) {
          const data = response.data.data;
          const basePrice = data.price || data.fare || data.monthlyPrice || data.rent || 0;
          const deliveryFee = data.deliveryFee || 0;
          const paymentBreakdown = calculatePayment(basePrice, deliveryFee);

          setOrderDetails({
            entityType,
            entityId,
            baseAmount: basePrice,
            deliveryFee,
            platformFee: paymentBreakdown.platformFee,
            customerShare: paymentBreakdown.customerShare,
            providerShare: paymentBreakdown.providerShare,
            customerPays: paymentBreakdown.customerPays,
            providerReceives: paymentBreakdown.providerReceives,
            platformReceives: paymentBreakdown.platformReceives,
            items:
              data.items ||
              [{ name: data.name || data.rentalName || data.title || 'Item', price: basePrice }],
            customer: data.customer || data.customerId,
            provider: data.provider || data.businessId || data.landlordId || data.landlord?._id,
          });

          if (data.customer?.phone) setMpesaPhone(data.customer.phone);
          else if (data.phone) setMpesaPhone(data.phone);
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [entityType, entityId, cartItems, cartTotal, paymentSuccess, directCheckout]);

  // Initiate STK Push Payment
  const initiatePayment = async () => {
    if (!mpesaPhone.trim()) {
      setPhoneError('Please enter a valid M-Pesa number');
      return;
    }

    if (!validatePhoneNumber(mpesaPhone)) {
      setPhoneError('Please enter a valid Kenyan number (e.g. 0712345678 or 0112345678)');
      return;
    }

    const formattedPhone = formatPhoneNumber(mpesaPhone);

    if (orderDetails?.entityType === 'cart') {
      if (!deliveryInfo.phone || !deliveryInfo.address) {
        setError('Please provide phone number and delivery location note (e.g. room/gate)');
        return;
      }
    }

    setProcessing(true);
    setError('');
    setPhoneError('');
    setPaymentFailed(false);
    setPaymentFailureMessage('');

    try {
      if (orderDetails?.entityType === 'cart') {
        const paymentResponse = await api.post('/payments/initiate', {
          entityType: 'cart',
          items: orderDetails.items,
          deliveryFee: orderDetails.deliveryFee,
          phoneNumber: formattedPhone,
          deliveryAddress: {
            phone: deliveryInfo.phone,
            address: deliveryInfo.address,
            neighborhood: deliveryInfo.neighborhood,
            landmark: deliveryInfo.landmark,
          },
        });

        if (paymentResponse.data.success) {
          const breakdown = paymentResponse.data.data.paymentBreakdown;
          if (breakdown) {
            setOrderDetails((current) => ({
              ...current,
              baseAmount: breakdown.basePrice ?? breakdown.baseAmount ?? current.baseAmount,
              deliveryFee: breakdown.deliveryFee ?? current.deliveryFee,
              customerPays: breakdown.customerPays ?? breakdown.totalAmount ?? current.customerPays,
            }));
          }
          setPaymentInitiated(true);
          setPaymentData(paymentResponse.data.data);
        } else {
          setError(paymentResponse.data.message || 'Failed to initiate payment');
        }
      } else {
        const response = await api.post('/payments/initiate', {
          entityType,
          entityId,
          amount: orderDetails.customerPays,
          deliveryFee: orderDetails.deliveryFee,
          phoneNumber: formattedPhone,
        });

        if (response.data.success) {
          const breakdown = response.data.data.paymentBreakdown;
          if (breakdown) {
            setOrderDetails((current) => ({
              ...current,
              baseAmount: breakdown.basePrice ?? breakdown.baseAmount ?? current.baseAmount,
              deliveryFee: breakdown.deliveryFee ?? current.deliveryFee,
              customerPays: breakdown.customerPays ?? breakdown.totalAmount ?? current.customerPays,
            }));
          }
          setPaymentInitiated(true);
          setPaymentData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to initiate payment');
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

  // Real-time Socket.IO listener for live payment confirmation & auto-redirect
  useEffect(() => {
    if (!socket || !paymentInitiated || !paymentData?.transactionRef) return;
    if (paymentSuccess || paymentFailed) return;

    const handlePaymentConfirmed = (data) => {
      const matchesRef =
        data?.transactionRef &&
        paymentData?.transactionRef &&
        data.transactionRef === paymentData.transactionRef;

      if (!matchesRef) return;

      const incomingStatus = data?.status;
      const incomingResultCodeRaw = data?.ResultCode ?? data?.resultCode;
      const incomingResultCode =
        incomingResultCodeRaw === '' || incomingResultCodeRaw === null || incomingResultCodeRaw === undefined
          ? undefined
          : Number(incomingResultCodeRaw);

      const isFailureStatus = incomingStatus === 'failed' || incomingStatus === 'FAILED';
      const isFailureResultCode = incomingResultCode !== undefined && incomingResultCode !== 0;

      const isSuccessStatus =
        incomingStatus === 'paid' ||
        incomingStatus === 'completed' ||
        incomingStatus === 'SUCCESS' ||
        incomingStatus === 'COMPLETED';

      const isConfirmedSuccess =
        isSuccessStatus && (incomingResultCode === undefined || incomingResultCode === 0);

      if (isConfirmedSuccess) {
        setPaymentSuccess(true);
        setPaymentFailed(false);
        setPaymentInitiated(true);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        if (!orderDetails?.isDirectPurchase) clearCart();

        // Auto-redirect to /customer/dashboard
        setTimeout(() => {
          navigate('/customer/dashboard', {
            state: {
              paymentSuccess: true,
              message: 'Payment received! Your order is being processed by the vendor ⚡',
            },
          });
        }, 1200);
        return;
      }

      if (isFailureStatus || isFailureResultCode) {
        const failureMessage =
          data?.resultDesc ||
          data?.ResultDesc ||
          mapMpesaFailureReason(incomingResultCodeRaw, incomingStatus);

        setPaymentFailed(true);
        setPaymentSuccess(false);
        setPaymentInitiated(false);
        setPaymentFailureMessage(failureMessage);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      }
    };

    socket.on('payment_confirmed', handlePaymentConfirmed);
    return () => {
      socket.off('payment_confirmed', handlePaymentConfirmed);
    };
  }, [
    socket,
    paymentInitiated,
    paymentData?.transactionRef,
    paymentSuccess,
    paymentFailed,
    mapMpesaFailureReason,
    orderDetails,
    clearCart,
    navigate,
  ]);

  // Fallback Polling status after STK push
  useEffect(() => {
    if (!paymentInitiated || !paymentData?.transactionRef || paymentSuccess) return;

    const poll = async () => {
      try {
        const res = await api.get(`/payments/status/${paymentData.transactionRef}`);
        const status = res.data?.data?.status;
        const resultCode = Number(res.data?.data?.ResultCode ?? res.data?.data?.resultCode ?? 0);

        if (resultCode === 4999) return 'pending';

        if (status === 'failed' || status === 'FAILED' || (resultCode > 0 && resultCode !== 4999)) {
          return 'failed';
        }

        if (status === 'paid' && resultCode === 0) {
          return 'success';
        }

        return 'pending';
      } catch {
        return 'pending';
      }
    };

    let elapsedTime = 0;
    const POLL_INTERVAL = 2000;
    const MAX_WAIT = 90000;

    pollIntervalRef.current = setInterval(async () => {
      elapsedTime += POLL_INTERVAL;
      const result = await poll();

      if (result === 'success') {
        setPaymentSuccess(true);
        setPaymentFailed(false);
        clearInterval(pollIntervalRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        if (!orderDetails?.isDirectPurchase) clearCart();
        setTimeout(() => {
          navigate('/customer/dashboard', {
            state: {
              paymentSuccess: true,
              message: 'Payment received! Your order is being processed by the vendor ⚡',
            },
          });
        }, 1200);
        return;
      }

      if (result === 'failed') {
        setPaymentSuccess(false);
        setPaymentFailed(true);
        clearInterval(pollIntervalRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        return;
      }

      if (elapsedTime >= MAX_WAIT) {
        clearInterval(pollIntervalRef.current);
        setPollingTimeout(true);
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [paymentInitiated, paymentData?.transactionRef, paymentSuccess, orderDetails, clearCart, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-bold text-gray-500">Preparing Olafasta checkout...</p>
      </div>
    );
  }

  if (!orderDetails && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-olaOrange-DEFAULT flex items-center justify-center mb-4">
          <Package size={28} />
        </div>
        <h2 className="text-xl font-black text-gray-900">Your Cart is Empty</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Explore campus meals, gas refills, electronics, and fashion in the marketplace.
        </p>
        <Link
          to="/marketplace"
          className="mt-5 px-6 py-3 rounded-2xl bg-olaOrange-DEFAULT hover:bg-olaOrange-hover text-white font-bold text-sm shadow-md"
        >
          Explore Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-6 md:py-10 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* ── Top Bar / Header ── */}
        <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
          <Link
            to={
              orderDetails?.entityType === 'cart'
                ? '/cart'
                : `/${user?.role === 'customer'
                  ? 'customer/dashboard'
                  : user?.role === 'landlord'
                    ? 'landlord/dashboard'
                    : user?.role === 'business'
                      ? 'business/dashboard'
                      : 'rider/dashboard'
                }`
            }
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-600 hover:text-olaOrange-DEFAULT transition-colors p-1 rounded-lg"
          >
            <ArrowLeft size={16} />
            <span>{orderDetails?.entityType === 'cart' ? 'Back to Cart' : 'Back to Dashboard'}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-olaOrange-light text-olaOrange-DEFAULT border border-olaOrange-DEFAULT/20 uppercase tracking-wider">
              ⚡ FASTA FASTA
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-olaGreen-light text-olaGreen-DEFAULT border border-olaGreen-DEFAULT/20">
              <ShieldCheck size={12} /> Escrow Protected
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Checkout & Pay
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Moi University Campus Super-App · Safe Safaricom M-Pesa Escrow
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ════════ LEFT COLUMN: Delivery Details & Payment (col-span-7) ════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── Card 1: Delivery Information (Only for cart / product orders) ── */}
            {orderDetails?.entityType === 'cart' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-olaOrange-light text-olaOrange-DEFAULT flex items-center justify-center font-bold">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900">Campus Delivery Details</h2>
                      <p className="text-xs text-gray-500">Select landmark & specify room/gate</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-olaOrange-DEFAULT bg-orange-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Step 1
                  </span>
                </div>

                {/* Quick-Tap Campus Landmark Pills */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Quick-Tap Campus Landmark *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CAMPUS_LANDMARKS.map((lm) => {
                      const isSelected =
                        deliveryInfo.neighborhood === lm.label || deliveryInfo.landmark === lm.label;
                      return (
                        <button
                          key={lm.id}
                          type="button"
                          onClick={() => handleSelectLandmark(lm.label)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'border-olaOrange-DEFAULT bg-olaOrange-light/50 text-gray-900 shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <span className="text-lg">{lm.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate">{lm.label}</p>
                            <p className="text-[10px] text-gray-400 truncate">{lm.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Room / Gate Note Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Specific Room, Hostel, or Gate Note *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={deliveryInfo.address}
                    onChange={handleInputChange}
                    placeholder="e.g., Sunrise Hostel Rm 4B, Stage Gate B, Annex"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-DEFAULT/20 text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-hidden font-medium"
                  />
                  <p className="text-[11px] text-gray-400">
                    Include room number or gate instructions for fast delivery
                  </p>
                </div>

                {/* Contact Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Contact Phone for Delivery Rider *
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={deliveryInfo.phone}
                      onChange={handleInputChange}
                      placeholder="07XXXXXXXX or 01XXXXXXXX"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-DEFAULT/20 text-sm text-gray-900 transition-all outline-hidden font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Card 2: M-Pesa Express Payment Card ── */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-olaGreen-DEFAULT/30 shadow-xs space-y-5 bg-gradient-to-b from-white via-white to-olaGreen-light/10">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-olaGreen-light text-olaGreen-DEFAULT flex items-center justify-center font-bold">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-900">M-Pesa Express Payment</h2>
                    <p className="text-xs text-gray-500">Direct Safaricom STK Push to your phone</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#008A27] text-white uppercase tracking-wider shadow-2xs">
                  M-PESA
                </span>
              </div>

              {/* STK Push Waiting State */}
              {paymentInitiated && !paymentSuccess && !paymentFailed ? (
                <div className="p-6 rounded-2xl bg-olaGreen-light/40 border border-olaGreen-DEFAULT/30 text-center space-y-4 animate-in fade-in">
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-white shadow-sm border-2 border-olaGreen-DEFAULT flex items-center justify-center">
                    <Smartphone size={28} className="text-olaGreen-DEFAULT animate-bounce" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-olaOrange-DEFAULT animate-ping" />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      Check your phone to enter your M-Pesa PIN 📲
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                      A prompt for{' '}
                      <strong className="text-olaGreen-DEFAULT font-black">
                        {formatCurrency(orderDetails?.customerPays || 0)}
                      </strong>{' '}
                      was sent to <strong className="text-gray-900">{formatPhoneNumber(mpesaPhone)}</strong>.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 bg-white/80 py-2 px-4 rounded-full w-fit mx-auto border border-gray-100">
                    <LoadingSpinner size="sm" />
                    <span>Listening for M-Pesa confirmation... ({countdown}s)</span>
                  </div>

                  {countdown <= 15 && (
                    <button
                      type="button"
                      onClick={initiatePayment}
                      disabled={processing}
                      className="text-xs font-bold text-olaOrange-DEFAULT hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      Didn't get the prompt? Resend STK Push
                    </button>
                  )}
                </div>
              ) : paymentSuccess ? (
                /* Payment Success Celebration State */
                <div className="p-6 rounded-2xl bg-olaGreen-light/50 border border-olaGreen-DEFAULT/40 text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-olaGreen-DEFAULT text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">
                    Payment Received! ⚡
                  </h3>
                  <p className="text-xs text-gray-600 max-w-xs mx-auto">
                    Your payment was secured by Olafasta Escrow. Redirecting to your dashboard...
                  </p>
                  <LoadingSpinner size="sm" />
                </div>
              ) : paymentFailed ? (
                /* Payment Failed State */
                <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertCircle size={26} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-red-800">M-Pesa Transaction Failed</h3>
                    <p className="text-xs text-red-600 mt-1">
                      {paymentFailureMessage || 'Transaction was cancelled or timed out.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentInitiated(false);
                      setPaymentFailed(false);
                      setPaymentFailureMessage('');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                /* Idle: Enter Phone & Initiate STK Push */
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Safaricom M-Pesa Number *
                      </label>
                      <span className="text-[11px] text-gray-400">07XX... or 01XX...</span>
                    </div>

                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={handlePhoneChange}
                        placeholder="0712345678"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm font-bold text-gray-900 transition-all outline-hidden ${
                          phoneError
                            ? 'border-red-500 bg-red-50/30'
                            : 'border-gray-200 focus:border-olaGreen-DEFAULT focus:ring-2 focus:ring-olaGreen-DEFAULT/20'
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-xs text-red-500 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={13} />
                        {phoneError}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={initiatePayment}
                    disabled={processing}
                    className="w-full py-4 px-6 rounded-2xl bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white font-black text-base shadow-lg shadow-olaGreen-DEFAULT/25 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Sending STK Prompt...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        <span>Pay {formatCurrency(orderDetails?.customerPays || 0)} via M-Pesa</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Lock size={12} /> 256-bit Encrypted
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-olaGreen-DEFAULT" /> Escrow Safe
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ════════ RIGHT COLUMN: Compact Collapsible Order Summary (col-span-5) ════════ */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs sticky top-6">
              {/* Header with Collapsible Toggle */}
              <div
                className="flex items-center justify-between pb-3 border-b border-gray-100 cursor-pointer select-none"
                onClick={() => setSummaryExpanded((prev) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-gray-900">Order Summary</h2>
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {(orderDetails?.items || []).length}{' '}
                    {orderDetails?.items?.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                >
                  {summaryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Items List */}
              {summaryExpanded && (
                <div className="space-y-3 py-3 border-b border-gray-100 max-h-72 overflow-y-auto no-scrollbar">
                  {(orderDetails?.items || []).map((item, index) => {
                    const itemImg = item.images?.[0] || item.image || null;
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {itemImg ? (
                            <img src={itemImg} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">🛍️</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-bold text-gray-400">
                              Qty: {item.quantity || 1}
                            </span>
                            {item.variant && (
                              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {item.variant}
                              </span>
                            )}
                          </div>
                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                            <p className="text-[11px] font-bold text-olaGreen-DEFAULT mt-0.5 truncate">
                              + {item.selectedAddOns.map((a) => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-black text-gray-900 flex-shrink-0">
                          {formatCurrency(item.price * (item.quantity || 1))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-3">
                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>Subtotal</span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(orderDetails?.baseAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>Delivery Fee</span>
                  {(orderDetails?.deliveryFee || 0) > 0 ? (
                    <span className="text-gray-900 font-bold">
                      {formatCurrency(orderDetails.deliveryFee)}
                    </span>
                  ) : (
                    <span className="text-olaGreen-DEFAULT font-bold bg-olaGreen-light px-2 py-0.5 rounded-full text-[10px]">
                      FREE (Campus Saver)
                    </span>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                      Total To Pay
                    </span>
                    <span className="text-[10px] text-gray-400">Includes all taxes and escrow</span>
                  </div>
                  <span className="text-2xl font-black text-olaOrange-DEFAULT leading-none">
                    {formatCurrency(orderDetails?.customerPays || 0)}
                  </span>
                </div>
              </div>

              {/* Trust Box */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3 mt-4 text-xs text-gray-600">
                <Truck size={20} className="text-olaGreen-DEFAULT flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-800">Moi University Express</p>
                  <p className="text-[11px] text-gray-500">Orders verified and dispatched fast</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
