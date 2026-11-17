// frontend/src/components/CheckoutModal.jsx
// Seamless Safaricom M-Pesa STK Push Payment Modal with Live Socket.IO Auto-Redirect

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  X, 
  RotateCw,
  Sparkles
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';

export default function CheckoutModal({ isOpen, onClose, order, onPaymentSuccess }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { clearCart } = useCart();
  const { success: toastSuccess, error: toastError } = useToast() || {};

  const [phone, setPhone] = useState(() => user?.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'prompted' | 'success' | 'failed'
  const [statusMessage, setStatusMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);

  // Sync phone when user profile loads
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user, phone]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format currency
  const formatKsh = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Validate Kenyan mobile phone
  const validatePhone = (input) => {
    const cleaned = String(input).replace(/\D/g, '');
    if (!cleaned) return 'Phone number is required';
    if (cleaned.length < 9) return 'Phone number is too short';
    
    // Valid Kenyan prefixes: 07..., 01..., 2547..., 2541...
    if (cleaned.startsWith('254') && cleaned.length === 12) return '';
    if (cleaned.startsWith('0') && cleaned.length === 10) return '';
    if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) return '';
    
    return 'Enter a valid Kenyan number (e.g. 07XXXXXXXX or 01XXXXXXXX)';
  };

  // STK Push Mutation
  const stkPushMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/payments/mpesa/stkpush', {
        orderId: order?._id,
        phoneNumber: phone,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPaymentState('prompted');
      setStatusMessage(data.data?.customerMessage || 'Please check your phone and enter your M-Pesa PIN.');
      setCountdown(60);

      // Start 60s countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to initiate M-Pesa prompt. Please try again.';
      setPaymentState('failed');
      setStatusMessage(msg);
      toastError?.(msg);
    },
  });

  const handlePay = (e) => {
    e.preventDefault();
    const errorMsg = validatePhone(phone);
    if (errorMsg) {
      setPhoneError(errorMsg);
      return;
    }
    setPhoneError('');
    stkPushMutation.mutate();
  };

  // Real-Time Socket Listener: Auto-redirect when M-Pesa callback hits server
  useEffect(() => {
    if (!socket || !order?._id) return;

    const handleOrderUpdate = (data) => {
      console.log('[CheckoutModal] Received order:status_updated:', data);
      
      // Match this specific order
      if (data?.orderId && String(data.orderId) !== String(order._id)) {
        return;
      }

      if (data?.status === 'paid') {
        if (timerRef.current) clearInterval(timerRef.current);
        setPaymentState('success');
        setStatusMessage('Payment confirmed! Vendor has received your order.');
        toastSuccess?.('M-Pesa payment confirmed!');

        // Clear user's cart
        clearCart?.();
        onPaymentSuccess?.(order);

        // Auto-redirect to Live Order Tracker after 1.5s celebratory delay
        setTimeout(() => {
          onClose?.();
          navigate('/customer/dashboard');
        }, 1600);
      } else if (data?.status === 'cancelled') {
        if (timerRef.current) clearInterval(timerRef.current);
        setPaymentState('failed');
        setStatusMessage(data?.message || 'M-Pesa payment was cancelled or timed out.');
      }
    };

    socket.on('order:status_updated', handleOrderUpdate);

    return () => {
      socket.off('order:status_updated', handleOrderUpdate);
    };
  }, [socket, order, clearCart, navigate, onClose, onPaymentSuccess, toastSuccess]);

  if (!isOpen) return null;

  const totalAmount = order?.finalAmount || order?.totalAmount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pay with M-Pesa</h3>
              <p className="text-emerald-100 text-xs">Instant Safaricom STK Push</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            disabled={paymentState === 'prompted'}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Order Summary Pill */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <div>
              <span className="text-[11px] font-semibold uppercase text-neutral-400 tracking-wider">Total Due</span>
              <p className="text-xl font-extrabold text-neutral-900">{formatKsh(totalAmount)}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-neutral-500">Order #{order?._id?.slice(-6)?.toUpperCase()}</span>
              <p className="text-xs text-neutral-600">{order?.items?.length || 1} item(s)</p>
            </div>
          </div>

          {/* STATE 1: IDLE / FORM ENTRY */}
          {paymentState === 'idle' && (
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Smartphone className="w-4 h-4 text-neutral-400" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="0712 345 678"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      phoneError
                        ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-neutral-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    }`}
                    autoFocus
                  />
                </div>
                {phoneError && <p className="text-xs text-red-600 mt-1 font-medium">{phoneError}</p>}
                <p className="text-[11px] text-neutral-500 mt-1">
                  We'll send an STK prompt to this phone requesting authorization.
                </p>
              </div>

              <button
                type="submit"
                disabled={stkPushMutation.isPending}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {stkPushMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending STK Prompt...
                  </>
                ) : (
                  <>
                    Send M-Pesa Prompt
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STATE 2: PROMPTED / WAITING FOR PIN */}
          {paymentState === 'prompted' && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              {/* Pulsing Phone Animation */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-md">
                  <Smartphone className="w-9 h-9 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-neutral-900">Waiting for M-Pesa...</h4>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
                  Please check phone <span className="font-semibold text-neutral-900 font-mono">{phone}</span> and enter your M-Pesa PIN.
                </p>
              </div>

              {/* Progress & Countdown Indicator */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/60 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    Awaiting PIN entry...
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{countdown}s</span>
                </div>
              </div>

              {/* Resend / Cancel Action */}
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    stkPushMutation.mutate();
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Resend Prompt
                </button>
                <span className="text-neutral-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setPaymentState('idle');
                  }}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-700"
                >
                  Change Number
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: PAYMENT CONFIRMED / REDIRECTING */}
          {paymentState === 'success' && (
            <div className="text-center py-6 space-y-4 animate-scale-up">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-neutral-900 flex items-center justify-center gap-1.5">
                  Payment Confirmed! <Sparkles className="w-4 h-4 text-emerald-500" />
                </h4>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto">
                  {statusMessage}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-700 pt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Redirecting to your Live Order Tracker...
              </div>
            </div>
          )}

          {/* STATE 4: FAILED / CANCELLED */}
          {paymentState === 'failed' && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-neutral-900">Payment Incomplete</h4>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
                  {statusMessage || 'The M-Pesa prompt was cancelled or timed out.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentState('idle')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Secure Trust Footer */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit Encrypted Safaricom Daraja Direct Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
