// frontend/src/components/JoinTeamModal.jsx
// Partner & Team Onboarding Application Modal for Comrades
// - Fully responsive (mobile / tablet / desktop)
// - Shows existing pending/approved/rejected application state
// - After successful submission redirects to ApplicationStatusPage

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bike,
  Store,
  Home,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Briefcase,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const ROLES = [
  {
    id: 'rider',
    name: 'Olafasta Rider',
    badge: 'Boda / Runner',
    icon: Bike,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-400',
    description: 'Deliver food, gas refills, and campus parcels with instant M-Pesa payouts.',
    earn: 'Earn daily with every delivery',
  },
  {
    id: 'business',
    name: 'Campus Vendor',
    badge: 'Kibanda / Shop',
    icon: Store,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    activeBg: 'bg-green-50',
    activeBorder: 'border-green-400',
    description: 'Sell food, groceries, fashion, gas, or tech products to thousands of students.',
    earn: 'Reach 10,000+ campus customers',
  },
  {
    id: 'landlord',
    name: 'Landlord / Agent',
    badge: 'Hostels & Rentals',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-400',
    description: 'List your bedsitters and hostels directly to verified comrades with zero brokers.',
    earn: 'Fill vacancies faster',
  },
  {
    id: 'assistant',
    name: 'Campus Assistant',
    badge: 'Ambassador',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    activeBg: 'bg-purple-50',
    activeBorder: 'border-purple-400',
    description: 'Earn commissions helping onboard local shops and managing pickup distribution.',
    earn: 'Commission on every referral',
  },
];

const CAMPUS_STAGES = [
  { value: 'Stage', label: 'Stage (Gate B Main Boda Shed)' },
  { value: 'Kesses', label: 'Kesses Center / Shopping Complex' },
  { value: 'Mabs', label: 'Mabs / Highrise Hostels' },
  { value: 'Chebarus', label: 'Chebarus / Talai Corner' },
  { value: 'Annex', label: 'Annex Campus Base' },
  { value: 'Gate A', label: 'Gate A Campus Gate' },
];

const CAMPUS_LOCATIONS = [
  { value: 'Stage', label: 'Stage (Gate B Marketplace)' },
  { value: 'Kesses', label: 'Kesses Center' },
  { value: 'Mabs', label: 'Mabs Area' },
  { value: 'Chebarus', label: 'Chebarus Center' },
  { value: 'Annex', label: 'Annex Campus' },
  { value: 'Gate A', label: 'Gate A' },
  { value: 'Campus Center', label: 'Student Center / Hall 6' },
];

const BUSINESS_CATEGORIES = [
  'Food, Drinks & Chill',
  'Daily Shops & Groceries',
  'Hostel Setup & Utilities',
  'Fashion & Beauty',
  'Electronics & Gadgets',
  'Health & Pharmacy',
  'General Campus Services',
];

const DASHBOARD_MAP = {
  rider: '/rider/dashboard',
  business: '/business/dashboard',
  landlord: '/landlord/dashboard',
  assistant: '/assistant/dashboard',
};

export default function JoinTeamModal({ isOpen, onClose, initialRole = 'rider' }) {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast() || {};

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [errorMsg, setErrorMsg] = useState('');

  // Rider Form State
  const [primaryStage, setPrimaryStage] = useState('Stage');
  const [isFootRunner, setIsFootRunner] = useState(false);
  const [bikePlate, setBikePlate] = useState('');
  const [riderMpesa, setRiderMpesa] = useState('');

  // Vendor Form State
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Food, Drinks & Chill');
  const [campusLocation, setCampusLocation] = useState('Stage');
  const [vendorMpesa, setVendorMpesa] = useState('');

  // Landlord Form State
  const [propertyName, setPropertyName] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [totalUnits, setTotalUnits] = useState('10');

  // Assistant Form State
  const [yearOfStudy, setYearOfStudy] = useState('3rd Year');
  const [campusArea, setCampusArea] = useState('');
  const [pitch, setPitch] = useState('');

  // Existing application state
  const existingApp = user?.roleApplication;
  const hasActiveApplication =
    existingApp && existingApp.status && existingApp.status !== 'none';
  const isPendingApp = existingApp?.status === 'pending';
  const isApproved = existingApp?.status === 'approved';
  const isRejected = existingApp?.status === 'rejected';

  // If the user's role itself is already a non-customer role (approved), close and redirect
  const isAlreadyPartner = user?.role && user.role !== 'customer';

  // Synchronize initial role
  useEffect(() => {
    if (initialRole) setSelectedRole(initialRole);
    setErrorMsg('');
  }, [initialRole, isOpen]);

  // Sync M-Pesa phone from user profile
  useEffect(() => {
    if (user?.phone) {
      setRiderMpesa(prev => prev || user.phone);
      setVendorMpesa(prev => prev || user.phone);
    }
  }, [user]);

  // Body Scroll Lock & Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    document.body.style.overflow = '';
    setErrorMsg('');
    if (onClose) onClose();
  };

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setErrorMsg('');
  };

  // React Query Mutation
  const applyMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/users/apply-role', payload);
      return res.data;
    },
    onSuccess: async (data) => {
      toastSuccess?.(
        data.message ||
          'Application submitted! Our campus admin team will review it within 24 hours.'
      );
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      if (refreshProfile) await refreshProfile();
      handleClose();
      // Redirect to application status page
      navigate('/application-status');
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        'Failed to submit application. Please check your details and try again.';
      setErrorMsg(msg);
      toastError?.(msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    let details = {};

    if (selectedRole === 'rider') {
      if (!isFootRunner && !bikePlate.trim()) {
        setErrorMsg('Please enter your motorbike registration plate, or select Foot Runner.');
        return;
      }
      details = {
        primaryStage,
        isFootRunner,
        bikePlate: isFootRunner ? 'FOOT_RUNNER' : bikePlate.trim().toUpperCase(),
        mpesaNumber: (riderMpesa || user?.phone || '').trim(),
      };
    } else if (selectedRole === 'business') {
      if (!businessName.trim()) {
        setErrorMsg('Please enter your business or shop name.');
        return;
      }
      details = {
        businessName: businessName.trim(),
        category: businessCategory,
        campusLocation,
        mpesaNumber: (vendorMpesa || user?.phone || '').trim(),
      };
    } else if (selectedRole === 'landlord') {
      if (!propertyName.trim()) {
        setErrorMsg('Please enter your hostel or property name.');
        return;
      }
      if (!propertyLocation.trim()) {
        setErrorMsg('Please enter the property location.');
        return;
      }
      details = {
        propertyName: propertyName.trim(),
        location: propertyLocation.trim(),
        units: parseInt(totalUnits, 10) || 1,
      };
    } else if (selectedRole === 'assistant') {
      if (!pitch.trim()) {
        setErrorMsg('Please tell us briefly why you would make a great campus ambassador.');
        return;
      }
      details = {
        yearOfStudy,
        campusArea: campusArea.trim() || 'Main Campus',
        pitch: pitch.trim(),
      };
    }

    applyMutation.mutate({ requestedRole: selectedRole, details });
  };

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const ActiveIcon = activeRoleConfig.icon;

  // ── If user is already a partner with an approved role, show dashboard link ───
  if (isAlreadyPartner && user.role !== 'customer') {
    const dash = DASHBOARD_MAP[user.role] || '/';
    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">You're Already a Partner!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your <span className="font-bold text-gray-800 capitalize">{user.role}</span> account is active on Olafasta.
          </p>
          <button
            onClick={() => { handleClose(); navigate(dash); }}
            className="w-full py-3 px-6 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            Go to My Dashboard
            <ArrowRight size={16} />
          </button>
          <button onClick={handleClose} className="mt-3 text-xs text-gray-400 font-semibold hover:text-gray-600 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── If there's an existing application, show its status ───────────────────
  if (hasActiveApplication) {
    const AppRoleConfig = ROLES.find(r => r.id === existingApp.requestedRole) || ROLES[0];
    const AppRoleIcon = AppRoleConfig.icon;
    return (
      <div
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${AppRoleConfig.bgColor} ${AppRoleConfig.color} flex items-center justify-center`}>
                <AppRoleIcon size={20} />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">Your Application</p>
                <p className="text-xs text-gray-400">{AppRoleConfig.label}</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {isPendingApp && (
              <>
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <Clock size={20} className="text-amber-600 animate-pulse flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-amber-800">Under Review</p>
                    <p className="text-xs text-amber-600">Olafasta admin will review your application within 24 hours</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-medium text-center">
                  You'll receive an in-app notification when your application is approved.
                </p>
                <button
                  onClick={() => { handleClose(); navigate('/application-status'); }}
                  className="w-full py-3 px-6 rounded-2xl border-2 border-orange-200 bg-orange-50 text-orange-700 font-bold text-sm transition-all flex items-center justify-center gap-2 hover:border-orange-400"
                >
                  <RefreshCw size={15} />
                  View Application Status
                </button>
              </>
            )}

            {isApproved && (
              <>
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-green-800">Approved! 🎉</p>
                    <p className="text-xs text-green-600">Your partner account is now active</p>
                  </div>
                </div>
                <button
                  onClick={() => { handleClose(); navigate(DASHBOARD_MAP[existingApp.requestedRole] || '/'); }}
                  className="w-full py-3 px-6 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} />
                  Go to My Dashboard
                  <ArrowRight size={15} />
                </button>
              </>
            )}

            {isRejected && (
              <>
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-red-800">Not Approved</p>
                    <p className="text-xs text-red-600">{existingApp?.notes || 'Please contact support for details'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center font-medium">
                  You can submit a new application for the same or a different role.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Registration Form ────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
        style={{ maxHeight: '95dvh' }}
        role="dialog"
        aria-modal="true"
        aria-label="Join Olafasta Team"
      >
        {/* ── Modal Header ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-white to-green-50/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${activeRoleConfig.bgColor} ${activeRoleConfig.color} flex items-center justify-center shadow-xs flex-shrink-0`}>
              <ActiveIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight">
                  Join Olafasta Team
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5E00] border border-orange-200/60 whitespace-nowrap">
                  Earn Daily
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Apply to become an approved partner on campus
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 active:scale-95 transition-all flex-shrink-0 ml-2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Role Selector ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 sm:px-5 pt-4 pb-3 bg-gray-50/70 border-b border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
            Select Your Partner Track
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROLES.map((role) => {
              const RoleIcon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleChange(role.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? `bg-white ${role.activeBorder} shadow-xs ring-2 ring-[#FF5E00]/15 border-[#FF5E00]`
                      : 'bg-white/70 border-gray-200 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <RoleIcon
                      size={15}
                      className={isSelected ? 'text-[#FF5E00]' : 'text-gray-400'}
                    />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#FF5E00] flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-900 leading-tight block">
                    {role.name}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight block truncate">
                    {role.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable Form Body ──────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4"
        >
          {/* Role Description */}
          <div className={`p-3.5 rounded-2xl border ${activeRoleConfig.borderColor} ${activeRoleConfig.bgColor}`}>
            <p className="text-xs font-semibold text-gray-800 leading-relaxed">
              {activeRoleConfig.description}
            </p>
            <p className={`text-[11px] font-bold mt-1 ${activeRoleConfig.color}`}>
              ✓ {activeRoleConfig.earn}
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-semibold">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── 1. Rider Fields ────────────────────────────────────── */}
          {selectedRole === 'rider' && (
            <div className="space-y-4">
              {/* Delivery Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Delivery Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFootRunner(false)}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !isFootRunner
                        ? 'border-[#FF5E00] bg-orange-50 text-[#FF5E00]'
                        : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Bike size={16} />
                    <span>Motorbike</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFootRunner(true)}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isFootRunner
                        ? 'border-[#FF5E00] bg-orange-50 text-[#FF5E00]'
                        : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Briefcase size={16} />
                    <span>Foot Runner</span>
                  </button>
                </div>
              </div>

              {!isFootRunner && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Motorbike Number Plate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bikePlate}
                    onChange={(e) => setBikePlate(e.target.value)}
                    placeholder="e.g., KMDF 123A"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold uppercase focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all placeholder:normal-case placeholder:font-normal"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Primary Campus Stage / Base <span className="text-red-500">*</span>
                </label>
                <select
                  value={primaryStage}
                  onChange={(e) => setPrimaryStage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none"
                >
                  {CAMPUS_STAGES.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  M-Pesa Payout Number
                </label>
                <input
                  type="tel"
                  value={riderMpesa}
                  onChange={(e) => setRiderMpesa(e.target.value)}
                  placeholder="07XX XXX XXX or 01XX XXX XXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ── 2. Vendor Fields ───────────────────────────────────── */}
          {selectedRole === 'business' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Business / Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Comrade Kitchen, Fasta Gas Hub"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Primary Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none"
                >
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Campus Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={campusLocation}
                  onChange={(e) => setCampusLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none"
                >
                  {CAMPUS_LOCATIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  M-Pesa Till / Payout Phone
                </label>
                <input
                  type="tel"
                  value={vendorMpesa}
                  onChange={(e) => setVendorMpesa(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ── 3. Landlord Fields ─────────────────────────────────── */}
          {selectedRole === 'landlord' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Hostel / Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g., Sunrise Apartments, Sunset Hostel"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Location & Nearest Gate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyLocation}
                  onChange={(e) => setPropertyLocation(e.target.value)}
                  placeholder="e.g., Mabs, 200m from Gate B"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Approximate Total Units / Bedsitters
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ── 4. Assistant Fields ────────────────────────────────── */}
          {selectedRole === 'assistant' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Year of Study
                  </label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none"
                  >
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year+</option>
                    <option>Postgraduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Campus Zone
                  </label>
                  <input
                    type="text"
                    value={campusArea}
                    onChange={(e) => setCampusArea(e.target.value)}
                    placeholder="e.g., Hostel H"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Short Pitch — "Why you?" <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Share a few words on your campus network, hostel influence, or prior experience..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#FF5E00]/30 focus:border-[#FF5E00] outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Submit Button ──────────────────────────────────────── */}
          <div className="pt-1 pb-safe">
            <button
              type="submit"
              disabled={applyMutation.isPending}
              className="w-full py-4 px-6 rounded-2xl bg-[#FF5E00] hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {applyMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Submit Partner Application</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium">
              Reviewed by Olafasta founding admins within 24 hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
