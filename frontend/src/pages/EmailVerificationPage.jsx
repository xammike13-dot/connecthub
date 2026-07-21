import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiClient';

const EmailVerificationPage = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticateWithToken } = useAuth();
  const cooldownRef = useRef(null);

  // Set message from registration if navigated to directly
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);

  // Get signup data from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem('signupEmail');
    const storedName = localStorage.getItem('signupName');
    const storedRole = localStorage.getItem('signupRole');

    if (!storedEmail) {
      // No signup data, redirect to register
      navigate('/register');
      return;
    }

    setEmail(storedEmail);
    setName(storedName || '');
    setRole(storedRole || 'customer');
  }, [navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
    }

    return () => {
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
      }
    };
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setError('Email not provided');
      return;
    }

    if (cooldown > 0) {
      return;
    }

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post('/verification/send-email', { email });
      setSuccess('Verification code sent successfully!');
      // Start cooldown (60 seconds)
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Ensure we have both email and code
    const currentEmail = email || localStorage.getItem('signupEmail');
    
    if (!currentEmail) {
      setError('Email not found. Please try registering again.');
      setLoading(false);
      return;
    }

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      setLoading(false);
      return;
    }

    console.log('[VERIFY] Attempting to verify email:', currentEmail, 'Code length:', code.length);

    try {
      const { data } = await api.post('/verification/verify-email', { email: currentEmail, code });
      console.log('[VERIFY] Response:', data);
      
      if (data.success) {
        // Save token and authenticate user
        if (data.token) {
          authenticateWithToken(data.token, data.user);
        }
        
        // Clear signup data
        localStorage.removeItem('signupEmail');
        localStorage.removeItem('signupName');
        localStorage.removeItem('signupRole');
        
        setSuccess('Email verified successfully!');
        
        // Determine redirect based on role and setup status
        setTimeout(() => {
          if (data.user) {
            const { role, setupCompleted } = data.user;
            if (!setupCompleted && role !== 'customer') {
              const setupPages = {
                landlord: '/setup/landlord',
                business: '/setup/business',
                rider: '/setup/rider',
              };
              navigate(setupPages[role] || '/customer/dashboard');
            } else {
              const dashboardMap = {
                customer: '/customer/dashboard',
                landlord: '/landlord/dashboard',
                business: '/business/dashboard',
                rider: '/rider/dashboard',
                admin: '/',
                assistant: '/assistant/dashboard',
              };
              navigate(dashboardMap[role] || '/customer/dashboard');
            }
          } else {
            navigate('/login', { state: { message: 'Email verified successfully! Please log in.' } });
          }
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // Mask email for display
  const maskEmail = (email) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.slice(0, 2)}***${username.slice(-1)}@${domain}`;
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

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
          <p className="mt-2 text-neutral-500 text-sm">Verify your email address</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
            Email Verification
          </h2>

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

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              We've sent a 6-digit verification code to:
            </p>
            <p className="text-sm font-semibold text-blue-900 mt-1">{maskEmail(email)}</p>
            {name && (
              <p className="text-sm text-blue-700 mt-1">
                Welcome, <strong>{name}</strong>!
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-neutral-700 mb-2">
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-xs text-neutral-500 mt-1 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full flex items-center justify-center disabled:opacity-50"
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
                'Verify Email'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:text-neutral-400 disabled:cursor-not-allowed"
              >
                {resending 
                  ? 'Sending...' 
                  : cooldown > 0 
                    ? `Resend code in ${cooldown}s` 
                    : 'Resend Code'}
              </button>
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

export default EmailVerificationPage;