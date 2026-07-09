import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiClient';
import OtpInput from '../components/ui/OtpInput';
import CountdownTimer from '../components/ui/CountdownTimer';

const PhoneVerificationPage = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  
  const location = useLocation();
  const email = location.state?.email;
  const fromSignup = location.state?.fromSignup;
  const navigate = useNavigate();

  const handleResend = async () => {
    const phone = localStorage.getItem('signupPhone');
    
    if (!phone) {
      setError('Phone number not found. Please start over.');
      return;
    }

    setResending(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.post('/verification/send-phone', { phone });
      setSuccess('Verification code sent to your WhatsApp');
      setTimeout(() => setSuccess(''), 3000);
      setCanResend(false);
      setResendTimer(60);
      
      // Handle cooldown
      if (response.data?.cooldownRemaining) {
        setError(`Please wait ${response.data.cooldownRemaining} seconds before requesting another code`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setResending(false);
    }
  };

  const { authenticateWithToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const phone = localStorage.getItem('signupPhone');
      const role = localStorage.getItem('signupRole');
      
      if (!phone) {
        setError('Phone number not found. Please start over.');
        setLoading(false);
        return;
      }

      const response = await api.post('/verification/verify-phone', { phone, code });
      const { token, user } = response.data;

      // Store auth token and user
      authenticateWithToken(token, user);

      // Clear signup storage
      localStorage.removeItem('signupPhone');
      localStorage.removeItem('signupEmail');
      localStorage.removeItem('signupRole');
      
      // Redirect based on role
      if (user.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else if (user.role === 'business') {
        navigate('/setup/business', { replace: true });
      } else if (user.role === 'landlord') {
        navigate('/setup/landlord', { replace: true });
      } else if (user.role === 'rider') {
        navigate('/setup/rider', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const remainingAttempts = err.response?.data?.remainingAttempts;
      if (remainingAttempts !== undefined) {
        setError(`${err.response?.data?.message || 'Invalid code'}. ${remainingAttempts} attempts remaining.`);
      } else {
        setError(err.response?.data?.message || 'Invalid or expired code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpComplete = (otp) => {
    setCode(otp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <span className="text-2xl font-bold text-neutral-900">ConnectHub</span>
          </Link>
          <p className="mt-2 text-neutral-500 text-sm">Verify your phone number</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2 text-center">
            Verify Your Phone Number
          </h2>
          <p className="text-neutral-500 text-center mb-6">
            We've sent a 6-digit verification code to your WhatsApp.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              Phone number:
            </p>
            <p className="text-sm font-semibold text-green-900 mt-1">
              {localStorage.getItem('signupPhone') || 'Not available'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-4">
                Enter the 6-digit code
              </label>
              <OtpInput 
                length={6} 
                value={code}
                onChange={setCode}
                onComplete={handleOtpComplete}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify Phone Number'
              )}
            </button>

            <div className="text-center">
              {!canResend ? (
                <div className="text-sm text-neutral-500">
                  Resend code in <CountdownTimer 
                    seconds={resendTimer} 
                    onExpire={() => setCanResend(true)}
                    className="font-semibold text-blue-600"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:text-neutral-400"
                >
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-neutral-600 hover:text-neutral-900">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerificationPage;
