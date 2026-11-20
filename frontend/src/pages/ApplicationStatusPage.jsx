// frontend/src/pages/ApplicationStatusPage.jsx
// Olafasta Partner Application Status Screen
// Shows pending / approved / rejected states and handles post-approval navigation

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Bike,
  Store,
  Home,
  Users,
  ArrowRight,
  RefreshCw,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react';

const ROLE_CONFIG = {
  rider: {
    icon: Bike,
    label: 'Olafasta Rider',
    badge: 'Boda / Delivery',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dashboard: '/rider/dashboard',
    pendingMsg: 'Our team is verifying your motorbike details and rider profile. This usually takes a few hours.',
    approvedMsg: 'You are now a verified Olafasta Rider! Start accepting delivery and boda requests on campus.',
  },
  business: {
    icon: Store,
    label: 'Campus Vendor',
    badge: 'Kibanda / Shop',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    dashboard: '/business/dashboard',
    pendingMsg: 'Our team is reviewing your business details. Once approved, you can start listing products and receiving orders.',
    approvedMsg: 'Your campus vendor account is active! Start adding products and managing your business on Olafasta.',
  },
  landlord: {
    icon: Home,
    label: 'Landlord / Agent',
    badge: 'Hostels & Rentals',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dashboard: '/landlord/dashboard',
    pendingMsg: 'Our team is reviewing your property details. Once approved, you can list your bedsitters and hostels.',
    approvedMsg: 'Your landlord account is active! Start adding and managing your properties on Olafasta.',
  },
  assistant: {
    icon: Users,
    label: 'Campus Assistant',
    badge: 'Ambassador',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    dashboard: '/assistant/dashboard',
    pendingMsg: 'Our admin team is reviewing your ambassador application. We\'ll notify you once it\'s approved.',
    approvedMsg: 'You are now a Campus Assistant on Olafasta! Access your dashboard to get started.',
  },
};

export default function ApplicationStatusPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const application = user?.roleApplication;
  const status = application?.status; // 'pending' | 'approved' | 'rejected' | 'none'
  const requestedRole = application?.requestedRole;
  const roleConfig = ROLE_CONFIG[requestedRole] || ROLE_CONFIG.rider;
  const RoleIcon = roleConfig.icon;

  // If the user's role has already been updated and they're approved, redirect them to their dashboard
  useEffect(() => {
    if (user?.role && user.role !== 'customer' && status === 'approved') {
      const dash = ROLE_CONFIG[user.role]?.dashboard || '/';
      navigate(dash, { replace: true });
    }
  }, [user, status, navigate]);

  // If no application, redirect back to home
  useEffect(() => {
    if (user && (!application || status === 'none')) {
      navigate('/', { replace: true });
    }
  }, [user, application, status, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setLastRefreshed(new Date());
    setRefreshing(false);
  };

  const appliedDate = application?.appliedAt
    ? new Date(application.appliedAt).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (!user || !application || status === 'none') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-gray-50 to-blue-50/30 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Olafasta
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Coloured top strip */}
          <div
            className={`h-1.5 w-full ${
              status === 'approved'
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : status === 'rejected'
                ? 'bg-gradient-to-r from-red-400 to-rose-500'
                : 'bg-gradient-to-r from-orange-400 to-amber-500'
            }`}
          />

          <div className="p-6 sm:p-8">
            {/* Role badge + icon */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-14 h-14 rounded-2xl ${roleConfig.bgColor} ${roleConfig.color} flex items-center justify-center shadow-sm`}
              >
                <RoleIcon size={28} />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">{roleConfig.label}</h1>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {roleConfig.badge}
                </span>
              </div>
            </div>

            {/* Status badge */}
            {status === 'pending' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mb-4">
                <Clock size={18} className="animate-pulse flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Application Under Review</p>
                  <p className="text-xs font-medium text-amber-600">{appliedDate ? `Submitted ${appliedDate}` : 'Submitted recently'}</p>
                </div>
              </div>
            )}

            {status === 'approved' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 mb-4">
                <CheckCircle2 size={18} className="flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Application Approved! 🎉</p>
                  <p className="text-xs font-medium text-emerald-600">Your account is now active</p>
                </div>
              </div>
            )}

            {status === 'rejected' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 mb-4">
                <XCircle size={18} className="flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Application Not Approved</p>
                  <p className="text-xs font-medium text-red-600">Please review and try again</p>
                </div>
              </div>
            )}

            {/* Status description */}
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {status === 'approved'
                ? roleConfig.approvedMsg
                : status === 'rejected'
                ? (application?.notes || 'Your application could not be approved at this time. Please contact Olafasta support for more information, or submit a new application.')
                : roleConfig.pendingMsg}
            </p>

            {/* Action buttons */}
            {status === 'approved' && (
              <Link
                to={roleConfig.dashboard}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                <Sparkles size={16} />
                Go to My Dashboard
                <ArrowRight size={16} />
              </Link>
            )}

            {status === 'pending' && (
              <div className="space-y-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border-2 border-gray-200 hover:border-orange-300 bg-white text-gray-700 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Checking Status...' : 'Check Application Status'}
                </button>
                {lastRefreshed && (
                  <p className="text-center text-xs text-gray-400 font-medium">
                    Last checked: {lastRefreshed.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}

            {status === 'rejected' && (
              <div className="space-y-3">
                <Link
                  to="/?join=true"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  Reapply for Partnership
                </Link>
                <Link
                  to="/support"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border border-gray-200 bg-white text-gray-600 font-bold text-sm transition-all active:scale-[0.98] hover:border-gray-300"
                >
                  <HelpCircle size={15} />
                  Contact Support
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Info panel (pending state) */}
        {status === 'pending' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 mb-1">What happens next?</p>
                <ul className="space-y-1.5 text-xs text-gray-500 font-medium">
                  <li className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">1</span>
                    Our admin reviews your application (usually within 24 hours)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">2</span>
                    You'll receive an in-app notification when approved
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">3</span>
                    Your account gets upgraded to your selected partner role
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">4</span>
                    You'll be redirected to your dashboard automatically
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Application summary */}
        {application?.details && Object.keys(application.details).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mt-4">
            <p className="font-bold text-sm text-gray-900 mb-3">Your Application Details</p>
            <div className="space-y-2">
              {Object.entries(application.details)
                .filter(([k]) => !['mpesaNumber', 'bikePlate'].includes(k)) // hide sensitive fields
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </span>
                    <span className="text-xs font-bold text-gray-700 text-right max-w-[55%] truncate">
                      {String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
