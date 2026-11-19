// frontend/src/pages/RegisterPage.jsx
// Frictionless Customer-First Onboarding for Olafasta

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already signed in — customers go to the homepage
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  // Validate Kenyan mobile format
  const validateKenyanPhone = (phoneNumber) => {
    const cleaned = String(phoneNumber).replace(/\D/g, '');
    if (!cleaned) return 'Phone number is required';
    if (cleaned.startsWith('0') && cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
      return '';
    }
    if (cleaned.startsWith('254') && cleaned.length === 12 && (cleaned.startsWith('2547') || cleaned.startsWith('2541'))) {
      return '';
    }
    if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
      return '';
    }
    return 'Enter a valid Kenyan number (e.g., 07XX XXX XXX or 01XX XXX XXX)';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear inline error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const phoneValidationMsg = validateKenyanPhone(formData.phone);
    if (phoneValidationMsg) {
      errors.phone = phoneValidationMsg;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      if (result.success) {
        // Customer stays on the homepage after registration.
        // They can access their account anytime via the Account icon in the bottom nav.
        navigate('/', { replace: true });
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 justify-center group">
            <div className="w-12 h-12 bg-olaOrange-DEFAULT rounded-2xl flex items-center justify-center shadow-lg shadow-olaOrange-DEFAULT/30 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-2xl tracking-tight">O</span>
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Olafasta<span className="text-olaOrange-DEFAULT">.</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-olaOrange-light text-olaOrange-DEFAULT mt-3">
            <Sparkles className="w-3.5 h-3.5" /> Campus Onboarding
          </div>
          <h2 className="mt-3 text-2xl font-black text-neutral-900 tracking-tight">
            Create your account
          </h2>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            Your ultimate campus plug for food, gas, boda rides, and essentials at Moi University.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-neutral-900/5 rounded-3xl border border-neutral-200/80">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 font-medium animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Mike Chege"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    fieldErrors.name
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-neutral-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-light/50'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* 2. Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@mu.ac.ke or gmail.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    fieldErrors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-neutral-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-light/50'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* 3. Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Phone Number (M-Pesa Ready)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="07XX XXX XXX or 01XX XXX XXX"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium font-mono transition-all ${
                    fieldErrors.phone
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-neutral-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-light/50'
                  }`}
                />
              </div>
              {fieldErrors.phone ? (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.phone}</p>
              ) : (
                <p className="text-[11px] text-neutral-400 mt-1">Used for 1-click M-Pesa STK prompts and order updates.</p>
              )}
            </div>

            {/* 4. Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    fieldErrors.password
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-neutral-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-light/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* 5. Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Confirm Password
                </label>
                {passwordsMatch && (
                  <span className="text-[11px] text-olaGreen-DEFAULT font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    fieldErrors.confirmPassword || passwordsMismatch
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : passwordsMatch
                      ? 'border-olaGreen-DEFAULT/60 focus:border-olaGreen-DEFAULT focus:ring-2 focus:ring-olaGreen-light'
                      : 'border-neutral-200 focus:border-olaOrange-DEFAULT focus:ring-2 focus:ring-olaOrange-light/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600"
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
              )}
              {passwordsMismatch && !fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1 font-medium">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-olaOrange-DEFAULT hover:bg-olaOrange-hover active:scale-[0.99] shadow-lg shadow-olaOrange-DEFAULT/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-600 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-olaOrange-DEFAULT hover:text-olaOrange-hover font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Upgrade Note for Vendors & Riders */}
          <div className="mt-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-center">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Want to sell on Olafasta or ride with us?{' '}
              <span className="text-neutral-700 font-semibold">
                Upgrade your account from your profile after signing up.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
