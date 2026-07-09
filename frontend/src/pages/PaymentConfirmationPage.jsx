import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const PaymentConfirmationPage = () => {
  const { transactionRef } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // transaction data shape used by this page
  const [transaction, setTransaction] = useState(null);

  // STEP 3: debug params + route
  const params = useParams();
  const orderId = transactionRef;
  console.log('[PAYMENT PAGE PARAMS]', {
    params,
    orderId,
    route: window.location.pathname,
  });

  const isCustomer = useMemo(() => {
    // If backend populates transaction.customer._id, compare with current user
    return user?.role === 'customer';
  }, [user?.role]);


  const [createdOrderFetchAttempted, setCreatedOrderFetchAttempted] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);



  // polling fallback (backend-only DB reads / status endpoint)
  useEffect(() => {
    if (!token || !transactionRef) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/payments/status/${transactionRef}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (cancelled) return;
        if (res.data?.success) {
          const statusRaw = res.data.data?.status;
          const mapped =
            statusRaw === 'SUCCESS' || statusRaw === 'COMPLETED' || statusRaw === 'paid'
              ? 'paid'
              : statusRaw === 'FAILED' || statusRaw === 'failed'
              ? 'failed'
              : 'pending';

          const statusData = {
            transactionRef,
            status: mapped,
            amount: res.data.data?.amount,
            paidAt: res.data.data?.paidAt,
            mpesaReceipt:
              res.data.data?.mpesaReceipt ||
              res.data.data?.mpesaReceiptNumber,
          };

          // Try to extract created order id from whatever the status payload includes
          const possibleCreatedOrder =
            res.data.data?.order ||
            res.data.data?.createdOrder ||
            res.data.data?.createdOrderId ||
            res.data.data?.entity;

          const possibleOrderId =
            possibleCreatedOrder?._id ||
            possibleCreatedOrder?.id ||
            possibleCreatedOrder;

        setTransaction(statusData);

        console.log('[FETCHING ORDER]', possibleOrderId || createdOrderId);


          if (possibleOrderId) {
            setCreatedOrderId(possibleOrderId);
          }

          if (mapped === 'paid' || mapped === 'failed') {
            setLoading(false);
            setCreatedOrderFetchAttempted(true);
            return;
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e.response?.data?.message || 'Failed to load payment status');
      }

      if (!cancelled) setTimeout(poll, 6000);
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [token, transactionRef]);

  const retryPayment = async () => {
    navigate('/checkout');
  };




  const statusView = useMemo(() => {
    if (!transaction) return null;

    if (transaction.status === 'paid') {
      return {
        icon: <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />,
        title: 'Payment received successfully.',
        subtitle: 'Your order has been created.',
        bannerClass: 'bg-green-50 border-green-200 text-green-800',
      };
    }

    if (transaction.status === 'failed') {
      return {
        icon: <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />,
        title: 'Payment failed.',
        subtitle: 'Please try again.',
        bannerClass: 'bg-red-50 border-red-200 text-red-800',
      };
    }

    return {
      icon: <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-3" />,
      title: 'Confirming payment...',
      subtitle: 'Please wait a moment.',
      bannerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };
  }, [transaction]);


  const [orderVerification, setOrderVerification] = useState({
    status: 'idle', // idle | verifying | exists | missing | error
    order: null,
  });


  useEffect(() => {
    const verifyOrderExists = async () => {
      if (!transaction) return;
      if (transaction.status !== 'paid') return;

      // Only verify once
        if (orderVerification.status === 'exists') return;


      setOrderVerification((prev) => ({
        ...prev,
        status: 'verifying',
        order: prev.order,
      }));

      if (!createdOrderId) {
        console.error('[PAYMENT ERROR] No created order ID available', {
          transactionRef,
        });
        setOrderVerification((prev) => ({
          ...prev,
          status: 'missing',
        }));
        return;
      }

      try {
        const orderRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/orders/${createdOrderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const order = orderRes.data?.data || orderRes.data?.order || null;


        console.log('[ORDER CREATED]', order);

        if (!order) {
          setOrderVerification((prev) => ({
            ...prev,
            status: 'missing',
            order: null,
          }));
          return;
        }

        setOrderVerification((prev) => ({
          ...prev,
          status: 'exists',
          order,
        }));
      } catch (e) {
        console.error('[ORDER VERIFICATION ERROR]', e?.response?.data || e);
        setOrderVerification((prev) => ({
          ...prev,
          status: 'error',
        }));
      }
    };

    verifyOrderExists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.status, createdOrderId, orderVerification.status]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Waiting for payment confirmation...</p>
        </div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={retryPayment}
            className="mt-4 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            Retry Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {statusView?.icon}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{statusView?.title}</h1>
          <p className="text-gray-600 mb-6">{statusView?.subtitle}</p>

          {transaction?.status === 'paid' && (
            <div className={`border rounded-lg p-5 mb-6 ${statusView.bannerClass} text-left`}>
              <div className="space-y-3">
                <p className="text-sm text-green-900 font-semibold">
                  Payment received successfully.
                </p>

                <p className="text-sm text-green-800">
                  Please wait for the business to accept your order.
                </p>
              </div>
            </div>
          )}



          {transaction?.status === 'failed' ? (
            <button
              onClick={retryPayment}
              className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              Retry Payment
              <ArrowRight size={18} />
            </button>
          ) : null}


          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/customer/orders')}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              View Orders
            </button>

            <div>
              <Link
                to={`/${isCustomer ? 'customer' : user?.role}-dashboard`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationPage;


