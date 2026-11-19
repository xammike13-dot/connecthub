// frontend/src/components/JoinTeamModal.jsx
// Partner & Team Onboarding Application Modal for Comrades

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Bike,
  Store,
  Home,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Phone,
  MapPin,
  Building,
  Briefcase
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
    description: 'Deliver food, gas refills, and campus parcels with instant M-Pesa payouts.',
  },
  {
    id: 'business',
    name: 'Campus Vendor',
    badge: 'Kibanda / Shop',
    icon: Store,
    color: 'text-olaGreen-DEFAULT',
    bgColor: 'bg-olaGreen-light',
    borderColor: 'border-olaGreen-DEFAULT/30',
    description: 'Sell food, groceries, fashion, gas, or tech products to thousands of students.',
  },
  {
    id: 'landlord',
    name: 'Landlord / Agent',
    badge: 'Hostels & Rentals',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'List your bedsitters and hostels directly to verified comrades with zero brokers.',
  },
  {
    id: 'assistant',
    name: 'Campus Assistant',
    badge: 'Ambassador',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Earn commissions helping onboard local shops and managing pickup distribution.',
  },
];

export default function JoinTeamModal({ isOpen, onClose, initialRole = 'rider' }) {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast() || {};

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [errorMsg, setErrorMsg] = useState('');

  // Rider Form State
  const [primaryStage, setPrimaryStage] = useState('Stage');
  const [isFootRunner, setIsFootRunner] = useState(false);
  const [bikePlate, setBikePlate] = useState('');
  const [riderMpesa, setRiderMpesa] = useState(user?.phone || '');

  // Vendor Form State
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Food, Drinks & Chill');
  const [campusLocation, setCampusLocation] = useState('Stage');
  const [vendorMpesa, setVendorMpesa] = useState(user?.phone || '');

  // Landlord Form State
  const [propertyName, setPropertyName] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('Stage');
  const [totalUnits, setTotalUnits] = useState('10');

  // Assistant Form State
  const [yearOfStudy, setYearOfStudy] = useState('3rd Year');
  const [campusArea, setCampusArea] = useState('Main Campus');
  const [pitch, setPitch] = useState('');

  // Synchronize initial role
  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
    setErrorMsg('');
  }, [initialRole, isOpen]);

  // Synchronize default M-Pesa phone
  useEffect(() => {
    if (user?.phone) {
      if (!riderMpesa) setRiderMpesa(user.phone);
      if (!vendorMpesa) setVendorMpesa(user.phone);
    }
  }, [user]);

  // Body Scroll Lock & Escape key listener
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
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
      toastSuccess?.(data.message || 'Application submitted successfully! Our campus admin team will review it.');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (refreshProfile) {
        await refreshProfile();
      }
      handleClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to submit application. Please check your details.';
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
        setErrorMsg('Please enter your motorbike registration plate or select Foot Runner.');
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
      details = {
        propertyName: propertyName.trim(),
        location: propertyLocation,
        units: parseInt(totalUnits, 10) || 1,
      };
    } else if (selectedRole === 'assistant') {
      if (!pitch.trim()) {
        setErrorMsg('Please tell us briefly why you would make a great campus ambassador.');
        return;
      }
      details = {
        yearOfStudy,
        campusArea,
        pitch: pitch.trim(),
      };
    }

    applyMutation.mutate({
      requestedRole: selectedRole,
      details,
    });
  };

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const IconComponent = activeRoleConfig.icon;

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-8 transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Join Olafasta Team Modal"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-green-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${activeRoleConfig.bgColor} ${activeRoleConfig.color} flex items-center justify-center shadow-xs`}>
              <IconComponent size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  Join Olafasta Team
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-olaOrange-light text-olaOrange-DEFAULT border border-olaOrange-DEFAULT/20">
                  Earn Daily
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Apply to become an approved partner on campus
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 active:scale-95 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="px-5 pt-4 pb-2 bg-gray-50/80 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Select Partner Track
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
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-white border-olaOrange-DEFAULT shadow-xs ring-2 ring-olaOrange-DEFAULT/20'
                      : 'bg-white/60 border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <RoleIcon
                      size={16}
                      className={isSelected ? 'text-olaOrange-DEFAULT' : 'text-gray-400'}
                    />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-olaOrange-DEFAULT" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    {role.name}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {role.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Brief Role Overview */}
          <div className={`p-3.5 rounded-2xl border ${activeRoleConfig.borderColor} ${activeRoleConfig.bgColor}`}>
            <p className="text-xs font-semibold text-gray-800">
              {activeRoleConfig.description}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-semibold animate-in shake">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Rider Fields */}
          {selectedRole === 'rider' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Delivery Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFootRunner(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !isFootRunner
                        ? 'border-olaOrange-DEFAULT bg-olaOrange-light text-olaOrange-DEFAULT'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    <Bike size={16} />
                    <span>Motorbike (Boda)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFootRunner(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isFootRunner
                        ? 'border-olaOrange-DEFAULT bg-olaOrange-light text-olaOrange-DEFAULT'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    <Briefcase size={16} />
                    <span>Foot Runner</span>
                  </button>
                </div>
              </div>

              {!isFootRunner && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Motorbike Number Plate
                  </label>
                  <input
                    type="text"
                    value={bikePlate}
                    onChange={(e) => setBikePlate(e.target.value)}
                    placeholder="e.g., KMDF 123A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold uppercase focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all placeholder:normal-case"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Primary Campus Stage / Base
                </label>
                <select
                  value={primaryStage}
                  onChange={(e) => setPrimaryStage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none"
                >
                  <option value="Stage">Stage (Gate B Main Boda Shed)</option>
                  <option value="Kesses">Kesses Center / Shopping Complex</option>
                  <option value="Mabs">Mabs / Highrise Hostels</option>
                  <option value="Chebarus">Chebarus / Talai Corner</option>
                  <option value="Annex">Annex Campus Base</option>
                  <option value="Gate A">Gate A Campus Gate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  M-Pesa Payout Number
                </label>
                <input
                  type="tel"
                  value={riderMpesa}
                  onChange={(e) => setRiderMpesa(e.target.value)}
                  placeholder="07XX XXX XXX or 01XX XXX XXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* 2. Vendor Fields */}
          {selectedRole === 'business' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Business / Shop Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Comrade Kitchen, Fasta Gas Hub"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Primary Category
                </label>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none"
                >
                  <option value="Food, Drinks & Chill">Food, Drinks &amp; Fast Food</option>
                  <option value="Daily Shops & Groceries">Daily Shops &amp; Groceries</option>
                  <option value="Hostel Setup & Utilities">Hostel Setup &amp; Gas Refills</option>
                  <option value="Fashion & Beauty">Fashion &amp; Mitumba Thrift</option>
                  <option value="Electronics & Gadgets">Electronics &amp; Phone Accessories</option>
                  <option value="Health & Pharmacy">Health &amp; Personal Care</option>
                  <option value="General Campus Services">General Campus Printing &amp; Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Campus Location
                </label>
                <select
                  value={campusLocation}
                  onChange={(e) => setCampusLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none"
                >
                  <option value="Stage">Stage (Gate B Marketplace)</option>
                  <option value="Kesses">Kesses Center</option>
                  <option value="Mabs">Mabs Area</option>
                  <option value="Chebarus">Chebarus Center</option>
                  <option value="Annex">Annex Campus</option>
                  <option value="Gate A">Gate A</option>
                  <option value="Campus Center">Student Center / Hall 6</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  M-Pesa Till / Payout Phone
                </label>
                <input
                  type="tel"
                  value={vendorMpesa}
                  onChange={(e) => setVendorMpesa(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* 3. Landlord Fields */}
          {selectedRole === 'landlord' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Hostel / Property Name
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g., Sunrise Apartments, Sunset Hostel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Location & Nearest Gate
                </label>
                <input
                  type="text"
                  value={propertyLocation}
                  onChange={(e) => setPropertyLocation(e.target.value)}
                  placeholder="e.g., Mabs, 200m from Gate B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Approximate Total Units / Bedsitters
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* 4. Assistant Fields */}
          {selectedRole === 'assistant' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Year of Study
                  </label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year+">4th Year+</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Campus Zone
                  </label>
                  <input
                    type="text"
                    value={campusArea}
                    onChange={(e) => setCampusArea(e.target.value)}
                    placeholder="e.g., Hostel H / Main Campus"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Short Pitch (&ldquo;Why you?&rdquo;)
                </label>
                <textarea
                  rows="3"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Share a few words on your campus network, hostel influence, or experience..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-olaOrange-DEFAULT focus:border-olaOrange-DEFAULT outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Bottom Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={applyMutation.isPending}
              className="w-full py-3.5 px-6 rounded-2xl bg-olaOrange-DEFAULT hover:bg-olaOrange-hover text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
              Vetted &amp; reviewed by Olafasta founding admins within 24 hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
