// frontend/src/pages/ApplicationStatusPage.jsx
// Olafasta Partner Registration Status — Redirect Handler
// Since registration now grants immediate dashboard access, this page
// simply redirects users to their respective dashboard based on their role.

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  Bike,
  Store,
  Home,
  Users,
  ArrowRight,
  Sparkles,
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
    message: 'Your rider account is active! Start accepting delivery and boda requests on campus.',
  },
  business: {
    icon: Store,
    label: 'Campus Vendor',
    badge: 'Kibanda / Shop',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    dashboard: '/business/dashboard',
    message: 'Your campus vendor account is active! Start adding products and managing your business.',
  },
  landlord: {
    icon: Home,
    label: 'Landlord / Agent',
    badge: 'Hostels & Rentals',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dashboard: '/landlord/dashboard',
    message: 'Your landlord account is active! Start adding and managing your properties.',
  },
  assistant: {
    icon: Users,
    label: 'Campus Assistant',
    badge: 'Ambassador',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    dashboard: '/assistant/dashboard',
    message: 'Your Campus Assistant account is active! Access your dashboard to get started.',
  },
};

export default function ApplicationStatusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.role;
  const roleConfig = ROLE_CONFIG[userRole] || null;

  // Immediate redirect: if user has a partner role, send them straight to their dashboard
  useEffect(() => {
    if (user && userRole && userRole !== 'customer' && roleConfig) {
      navigate(roleConfig.dashboard, { replace: true });
    } else if (user && (!userRole || userRole === 'customer')) {
      // Customer with no partner role — go home
      navigate('/', { replace: true });
    }
  }, [user, userRole, roleConfig, navigate]);

  // Brief transitional UI while redirect happens
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Fallback UI (shown briefly before redirect completes)
  const RoleIcon = roleConfig?.icon || CheckCircle2;

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

        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="h-1.5 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

          <div className="p-6 sm:p-8">
            {/* Role badge + icon */}
            {roleConfig && (
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
            )}

            {/* Active status */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 mb-4">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Registration Complete! 🎉</p>
                <p className="text-xs font-medium text-emerald-600">Your account is active — redirecting to your dashboard...</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {roleConfig?.message || 'Your account is now active on Olafasta.'}
            </p>

            {/* Dashboard button */}
            {roleConfig && (
              <Link
                to={roleConfig.dashboard}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                <Sparkles size={16} />
                Go to My Dashboard
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
