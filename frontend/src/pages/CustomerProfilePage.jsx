// frontend/src/pages/CustomerProfilePage.jsx
// Dedicated Customer Profile & Account Management Page for Olafasta

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { useToast } from '../components/Toast';
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  LogOut,
  Edit3,
  Check,
  Package,
  Heart,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  HelpCircle,
  Home,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Bike,
  Store,
  Users,
  XCircle,
} from 'lucide-react';

const DASHBOARD_MAP = {
  rider: '/rider/dashboard',
  business: '/business/dashboard',
  landlord: '/landlord/dashboard',
  assistant: '/assistant/dashboard',
  caretaker: '/caretaker/dashboard',
};

const ROLE_LABELS = {
  rider: 'Olafasta Rider',
  business: 'Campus Vendor',
  landlord: 'Landlord / Agent',
  assistant: 'Campus Assistant',
  caretaker: 'Caretaker',
};

const ROLE_ICONS = {
  rider: Bike,
  business: Store,
  landlord: Home,
  assistant: Users,
};

export default function CustomerProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Partner section state
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Optionally fetch fresh profile on mount
  useEffect(() => {
    const loadFreshProfile = async () => {
      try {
        setLoading(true);
        const { data } = await authAPI.getProfile();
        const freshUser = data?.user || data?.data;
        if (freshUser) {
          setProfileForm({
            name: freshUser.name || '',
            email: freshUser.email || '',
            phone: freshUser.phone || '',
          });
        }
      } catch (err) {
        console.warn('[CustomerProfilePage] Could not fetch fresh profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFreshProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (profileMessage.text) setProfileMessage({ type: '', text: '' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });

    if (!profileForm.name.trim()) {
      setProfileMessage({ type: 'error', text: 'Full name is required.' });
      return;
    }
    if (!profileForm.email.trim() || !/^\S+@\S+\.\S+$/.test(profileForm.email.trim())) {
      setProfileMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase(),
        phone: profileForm.phone.trim(),
      });

      if (data.success) {
        await refreshProfile();
        setIsEditing(false);
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        addToast?.('Profile updated successfully', 'success');
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setProfileMessage({ type: 'error', text: msg });
      addToast?.(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordMessage.text) setPasswordMessage({ type: '', text: '' });
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!passwordForm.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      addToast?.('Password updated successfully', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password. Please check your current password.';
      setPasswordMessage({ type: 'error', text: msg });
      addToast?.(msg, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out of your account?')) {
      await logout();
      addToast?.('You have been signed out successfully.', 'info');
      navigate('/', { replace: true });
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
    : 'Active Member';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-600 hover:text-[#FF5E00] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Olafasta</span>
          </Link>
          <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 size={12} />
            <span>Authenticated Session</span>
          </div>
        </div>

        {/* ── 1. Hero Profile Header Card ───────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80 relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#FF5E00]/10 to-transparent rounded-bl-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative">
            {/* Avatar Circle */}
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'Customer'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#FF5E00]/30 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#FF5E00] to-orange-400 flex items-center justify-center text-white text-3xl font-black shadow-md shadow-orange-500/20">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User size={36} />}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" title="Active">
                <span className="w-2 h-2 bg-white rounded-full" />
              </span>
            </div>

            {/* User Meta */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    {user?.name || 'Customer Account'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                    {user?.email || 'No email registered'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-[#FF5E00] hover:bg-orange-100 transition-colors self-center sm:self-start mt-2 sm:mt-0"
                >
                  <Edit3 size={13} />
                  <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
                </button>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px] capitalize">
                  <Shield size={12} className="text-[#FF5E00]" />
                  {user?.role || 'Customer'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-medium">
                  <Clock size={12} />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Profile Details & Edit Form ─────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-black text-gray-900">Personal Information</h2>
              <p className="text-xs text-gray-500">Your saved account details for orders and notifications</p>
            </div>
          </div>

          {/* Profile Alert Message */}
          {profileMessage.text && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium mb-4 flex items-center gap-2 ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {profileMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{profileMessage.text}</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Phone Number (M-Pesa)
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    placeholder="07XX XXX XXX or 01XX XXX XXX"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium font-mono focus:bg-white focus:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#FF5E00] hover:bg-orange-600 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-2xs">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Not set'}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-2xs">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.email || 'Not set'}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-2xs">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
                  <p className="text-sm font-bold text-gray-900 font-mono truncate">{user?.phone || 'Not set'}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-2xs">
                  <Shield size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account Role</p>
                  <p className="text-sm font-bold text-gray-900 capitalize truncate">{user?.role || 'Customer'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Quick Account Links (Orders, Wishlist, Campus Services) ──────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Link
            to="/customer/orders"
            className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-[#FF5E00] hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5E00] flex items-center justify-center">
                <Package size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#FF5E00] transition-colors">Order History</p>
                <p className="text-xs text-gray-500">Track and view your recent purchases</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-[#FF5E00] transition-colors" />
          </Link>

          <Link
            to="/wishlist"
            className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-[#FF5E00] hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                <Heart size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 group-hover:text-pink-600 transition-colors">Saved Wishlist</p>
                <p className="text-xs text-gray-500">View items saved for later</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-pink-600 transition-colors" />
          </Link>
        </div>

        {/* ── 3b. Partner / Earn Section ─────────────────────────────────────── */}
        {(() => {
          const application = user?.roleApplication;
          const appStatus = application?.status;
          const isPartnerRole = user?.role && user.role !== 'customer';
          const partnerDash = DASHBOARD_MAP[user?.role];

          // Already a full partner with an active role
          if (isPartnerRole && partnerDash) {
            return (
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5E00] flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">Partner Dashboard</p>
                      <p className="text-xs text-gray-500 capitalize">{ROLE_LABELS[user.role] || user.role} Account</p>
                    </div>
                  </div>
                  <Link
                    to={partnerDash}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FF5E00] text-white hover:bg-orange-600 transition-colors"
                  >
                    Open Dashboard
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          }

          // Has an approved application — link to dashboard
          if (appStatus === 'approved' && application.requestedRole) {
            const dash = DASHBOARD_MAP[application.requestedRole];
            if (dash) {
              return (
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900">Registration Complete!</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {ROLE_LABELS[application.requestedRole] || application.requestedRole} account is active
                      </p>
                      <Link
                        to={dash}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FF5E00] text-white hover:bg-orange-600 transition-colors"
                      >
                        Go to Dashboard
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }
          }

          // Has a rejected application
          if (appStatus === 'rejected') {
            return (
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900">Application Not Approved</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {application?.notes || 'Your partner application was not approved. You may apply again.'}
                    </p>
                    <Link
                      to="/?join=true"
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FF5E00] text-white hover:bg-orange-600 transition-colors"
                    >
                      <Sparkles size={13} />
                      Reapply Now
                    </Link>
                  </div>
                </div>
              </div>
            );
          }

          // No application — show Join Us & Earn CTA
          return (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-5 sm:p-6 shadow-sm border border-orange-200/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-200/30 to-transparent rounded-bl-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FF5E00] text-white flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Join Us & Earn</p>
                    <p className="text-xs text-gray-500">Become an Olafasta partner today</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium mb-4 leading-relaxed">
                  Earn daily by delivering parcels, selling on campus, listing properties, or becoming a campus ambassador.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { icon: Bike, label: 'Rider', sub: 'Boda / Delivery' },
                    { icon: Store, label: 'Vendor', sub: 'Kibanda / Shop' },
                    { icon: Home, label: 'Landlord', sub: 'Hostels & Rentals' },
                    { icon: Users, label: 'Assistant', sub: 'Ambassador' },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-2 p-2 rounded-xl bg-white/70 border border-orange-100">
                      <Icon size={14} className="text-[#FF5E00] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 leading-tight">{label}</p>
                        <p className="text-[10px] text-gray-400 leading-tight truncate">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/?join=true"
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  <Sparkles size={15} />
                  Apply to Join Olafasta Team
                  <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* ── 4. Account Settings: Change Password ──────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Security & Password</h2>
                <p className="text-xs text-gray-500">Manage your login password and account credentials</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {showPasswordSection ? 'Hide' : 'Change Password'}
            </button>
          </div>

          {passwordMessage.text && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium mt-4 flex items-center gap-2 ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          {showPasswordSection && (
            <form onSubmit={handleSavePassword} className="space-y-4 mt-5 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    name="currentPassword"
                    required
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]/10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    name="newPassword"
                    required
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]/10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#FF5E00] hover:bg-orange-600 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── 5. Sign Out Section ───────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-gray-900">Sign Out of Olafasta</h2>
            <p className="text-xs text-gray-500">Sign out of your account on this device. You can sign back in anytime.</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
