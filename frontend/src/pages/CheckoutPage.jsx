import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { AlertCircle, CheckCircle, Phone, MapPin, Package } from 'lucide-react';
import { calculatePayment, formatCurrency } from '../utils/paymentCalculator';

const CheckoutPage = () => {
  console.log('[CHECKOUT PAGE MOUNTED]');

  const params = useParams();
  const { entityType, entityId } = params;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const [createdOrderId, setCreatedOrderId] = useState(null);

  const [orderDetails, setOrderDetails] = useState(null);

  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '');
  const [phoneError, setPhoneError] = useState('');

  const [deliveryInfo, setDeliveryInfo] = useState({
    phone: user?.phone || '',
    address: '',
    neighborhood: '',
    landmark: '',
  });

  const [pollingTimeout, setPollingTimeout] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // M-Pesa failure UX state (customer remains on Checkout page)
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentFailureMessage, setPaymentFailureMessage] = useState('');

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    console.log('paymentSuccess:', paymentSuccess);
    console.log('paymentFailed:', paymentFailed);
  }, [paymentSuccess, paymentFailed]);




  const formatPhoneNumber = useCallback((phone) => {

    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 9 && /^[789]/.test(cleaned)) {
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

  const mapMpesaFailureReason = useCallback((resultCode, backendStatus) => {
    // Requirements:
    // - ResultCode = 0 => success
    // - ResultCode != 0 => failed
    // - Show common messages for all failures.

    const rcNumber = Number(resultCode);

    if (backendStatus === 'failed') {
      return 'Insufficient balance';
    }

    switch (rcNumber) {
      case 1:
        return 'Insufficient balance';
      case 1032:
        return 'User cancelled transaction';
      case 1037:
        return 'STK timeout / phone unreachable';
      case 2001:
        return 'Invalid PIN';
      case 9999:
        return 'General failure';
      default:
        return 'Insufficient balance';
    }
  }, []);


  // Fetch real order details from API or prepare cart checkout
  useEffect(() => {
    console.log('[FETCH ORDER DETAILS START]');

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        console.log('[FETCH ORDER DETAILS START]');


        // Cart-based checkout
        if (!entityType && !entityId) {

          // After successful payment the cart is cleared,
          // but the checkout page must continue displaying
          // the already-created order summary.
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
            items: cartItems.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              product: item._id,
            })),
          });
          return;
        }

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
          console.log('[FETCH ORDER DETAILS SUCCESS]', response?.data);
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
  }, [entityType, entityId, cartItems, cartTotal, paymentSuccess]);


  const initiatePayment = async () => {
    if (!mpesaPhone.trim()) {
      setPhoneError('Please enter a valid M-Pesa number');
      return;
    }

    if (!validatePhoneNumber(mpesaPhone)) {
      setPhoneError('Please enter a valid M-Pesa number (e.g., 0712345678 or 254712345678)');
      return;
    }

    const formattedPhone = formatPhoneNumber(mpesaPhone);

    if (orderDetails?.entityType === 'cart') {
      if (!deliveryInfo.phone || !deliveryInfo.address) {
        setError('Please provide phone number and delivery address');
        return;
      }
    }

    setProcessing(true);
    setError('');
    setPhoneError('');

    try {
      if (orderDetails?.entityType === 'cart') {
        // PAYMENT-FIRST: Initiate payment directly without creating order first
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
          // If payment confirmation has already arrived, clear immediately.
          if (paymentSuccess) {
            clearCart();
            console.log('[CART CLEARED]');
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

  // Listen for real-time payment confirmation via socket
  useEffect(() => {
    if (!socket || !paymentInitiated || !paymentData?.transactionRef) return;
    if (paymentSuccess || paymentFailed) return;

    const handlePaymentConfirmed = (data) => {
      console.log('[SOCKET PAYMENT EVENT]', data);

      const matchesRef =
        data?.transactionRef && paymentData?.transactionRef &&
        data.transactionRef === paymentData.transactionRef;

      if (!matchesRef) return;

      const incomingStatus = data?.status;
      const incomingResultCodeRaw = data?.ResultCode ?? data?.resultCode;
      const incomingResultCode =
        incomingResultCodeRaw === '' || incomingResultCodeRaw === null || incomingResultCodeRaw === undefined
          ? undefined
          : Number(incomingResultCodeRaw);

      const isFailureStatus =
        incomingStatus === 'failed' || incomingStatus === 'FAILED';
      const isFailureResultCode =
        incomingResultCode !== undefined && incomingResultCode !== 0;

      const isSuccessStatus =
        incomingStatus === 'paid' ||
        incomingStatus === 'completed' ||
        incomingStatus === 'SUCCESS' ||
        incomingStatus === 'COMPLETED';

      const isConfirmedSuccess =
        isSuccessStatus && (incomingResultCode === undefined || incomingResultCode === 0);

      // success (ONLY when status indicates success AND ResultCode === 0 when present)
      if (isConfirmedSuccess) {
        setPaymentSuccess(true);
        setPaymentFailed(false);
        setPaymentInitiated(true);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }

      // failure
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
      }
    };

    socket.on('payment_confirmed', handlePaymentConfirmed);

    return () => {
      socket.off('payment_confirmed', handlePaymentConfirmed);
    };
  }, [socket, paymentInitiated, paymentData?.transactionRef, paymentSuccess, paymentFailed, mapMpesaFailureReason]);



  // Cart is cleared ONLY when the customer clicks "View My Orders".
  // (Intentionally disabled: previous auto-clear-on-payment-success effect)


  // Poll payment status after STK push
  useEffect(() => {
    if (!paymentInitiated || !paymentData?.transactionRef || paymentSuccess) return;

    const poll = async () => {
      try {
        const res = await api.get(
          `/payments/status/${paymentData.transactionRef}`
        );

        const status = res.data?.data?.status;
        const resultCode = Number(
          res.data?.data?.ResultCode ??
          res.data?.data?.resultCode ??
          0
        );


        console.log('[PAYMENT POLL]', { status, resultCode });

        // ResultCode 4999 = transaction still processing, keep as pending
        if (resultCode === 4999) {
          return 'pending';
        }

        // Specific failure codes (1, 1032, 1037, 2001, etc.) = payment failed
        if (
          status === 'failed' ||
          status === 'FAILED' ||
          (resultCode > 0 && resultCode !== 4999)
        ) {
          return 'failed';
        }

        // Only show success when status === 'paid' AND resultCode === 0
        if (
          status === 'paid' &&
          resultCode === 0
        ) {
          return 'success';
        }

        return 'pending';
      } catch (e) {
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
        return;
      }

      if (result === 'failed') {
        setPaymentSuccess(false);
        setPaymentFailed(true);
        clearInterval(pollIntervalRef.current);
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
  }, [paymentInitiated, paymentData?.transactionRef, paymentSuccess]);


  // Guard: in this page success must only be set after explicit ResultCode===0 confirmation.

  if (!orderDetails) {

    // Marketplace checkout must never render an "Order Not Found" UI.
    console.log('[CHECKOUT WARNING] Order verification unavailable');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {(orderDetails?.items || []).map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>
                  {orderDetails?.entityType === 'rental'
                    ? 'Room Price'
                    : orderDetails?.entityType === 'ride'
                      ? 'Ride Fare'
                      : 'Product Price'}
                </span>
                <span>{formatCurrency(orderDetails?.baseAmount || 0)}</span>
              </div>
              {(orderDetails?.deliveryFee || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(orderDetails?.deliveryFee || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Platform Fee (Customer Share 5%)</span>
                <span>{formatCurrency(orderDetails?.customerShare || 0)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total To Pay</span>
                  <span className="text-blue-600">
                    {formatCurrency(orderDetails?.customerPays || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The platform fee is shared equally between you and the provider. The provider will receive{' '}
                <strong>{formatCurrency(orderDetails?.providerReceives)}</strong> after completion.
              </p>
            </div>
          </div>

          {orderDetails?.entityType === 'cart' && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Delivery Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      name="phone"
                      value={deliveryInfo.phone}
                      onChange={handleInputChange}
                      placeholder="0712345678"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={deliveryInfo.address}
                    onChange={handleInputChange}
                    placeholder="Street name, building name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                    <input
                      type="text"
                      name="neighborhood"
                      value={deliveryInfo.neighborhood}
                      onChange={handleInputChange}
                      placeholder="e.g., Kilimani"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      name="landmark"
                      value={deliveryInfo.landmark}
                      onChange={handleInputChange}
                      placeholder="Nearby landmark"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Phone size={20} />
              Payment Method
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">M-Pesa Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={handlePhoneChange}
                  placeholder="2547XXXXXXXX"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${phoneError ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>
              {phoneError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {phoneError}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">Enter your M-Pesa number (e.g., 0712345678 or 254712345678)</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center p-4 border-2 border-green-500 rounded-lg bg-green-50">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">M</span>
                </div>
                <div>
                  <p className="font-semibold">M-Pesa</p>
                  <p className="text-sm text-gray-600">Pay securely using M-Pesa STK Push</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Payment action area (must keep Checkout layout stable; no redirect on success) */}
            {paymentSuccess ? (
              <>
                <button
                  disabled
                  className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg opacity-50 cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {orderDetails?.entityType === 'rental' ? 'Room booked successfully' : 'Payment Successful'}
                </button>

                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      {orderDetails?.entityType === 'rental' ? (
                        <>
                          <p className="text-base font-bold text-green-800">Room booked successfully</p>
                          <p className="text-sm text-green-700 mt-1">Your booking has been confirmed and the landlord has been notified.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-bold text-green-800">Payment received successfully.</p>
                          <p className="text-sm text-green-700 mt-1">Please wait for the business to accept your order.</p>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      console.log('[VIEW SUCCESS CLICKED]');

                      if (orderDetails?.entityType === 'cart') {
                        clearCart();
                        console.log('[CART CLEARED AFTER SUCCESS]');
                      }

                      // Navigate based on entity type
                      if (orderDetails?.entityType === 'rental') {
                        navigate('/customer/bookings');
                      } else {
                        navigate('/customer/orders');
                      }
                    }}
                    className="mt-4 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Package size={18} />
                    {orderDetails?.entityType === 'rental' ? 'View My Rentals' : 'View My Orders'}
                  </button>
                </div>
              </>
            ) : paymentFailed ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />

                    <div>
                      <p className="font-semibold text-red-800">Payment Failed</p>

                      <p className="text-sm text-red-700 mt-1">{paymentFailureMessage}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPaymentInitiated(false);
                    setPaymentFailed(false);
                    setPaymentFailureMessage('');
                  }}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Try Again
                </button>
              </div>
            ) : !paymentInitiated ? (
              <button
                onClick={initiatePayment}
                disabled={processing}
                className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Processing...
                  </>
                ) : (
                  `Pay ${orderDetails ? formatCurrency(orderDetails.customerPays) : ''}`
                )}
              </button>
            ) : pollingTimeout ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">Payment is taking longer than expected.</p>
                    <p className="text-sm text-yellow-700 mt-1">Please check your Orders page.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/customer/orders')}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Orders
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">STK Push sent to your phone.</p>
                    <p className="text-sm text-green-700 mt-1">Please enter your M-Pesa PIN to complete payment.</p>
                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Processing...
                    </p>
                  </div>
                </div>

                {paymentData?.transactionRef && (
                  <p className="text-xs text-gray-500 text-center">
                    Transaction Ref: {paymentData.transactionRef}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
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
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
              >
                ← {orderDetails?.entityType === 'cart' ? 'Back to Cart' : 'Back to Dashboard'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

