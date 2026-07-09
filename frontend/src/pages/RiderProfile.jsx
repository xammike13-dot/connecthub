import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { riderAPI, uploadAPI } from '../services/api';
import { Camera, Upload, User, Bike, MapPin, Clock, DollarSign, Save, X } from 'lucide-react';
import axios from 'axios';

const RiderProfile = () => {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const profilePhotoInputRef = useRef(null);
  const motorcyclePhotoInputRef = useRef(null);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    riderProfile: {
      vehicleType: '',
      vehicleNumber: '',
      licenseNumber: '',
      nationalId: '',
      workingArea: '',
      workingHours: {
        start: '',
        end: '',
      },
      dayRatePerKm: 50,
      nightRatePerKm: 75,
      profilePhoto: '',
      profilePhotoPublicId: '',
      motorcycle: {
        brand: '',
        model: '',
        plateNumber: '',
        color: '',
        year: '',
        photo: '',
        photoPublicId: '',
      },
    },
  });

  const [wallet, setWallet] = useState({
    balance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await riderAPI.getProfile();
        const data = response.data.data;
        
        setForm({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatar: data.user.avatar || '',
          riderProfile: {
            vehicleType: data.user.riderProfile?.vehicleType || '',
            vehicleNumber: data.user.riderProfile?.vehicleNumber || '',
            licenseNumber: data.user.riderProfile?.licenseNumber || '',
            nationalId: data.user.riderProfile?.nationalId || '',
            workingArea: data.user.riderProfile?.workingArea || '',
            workingHours: {
              start: data.user.riderProfile?.workingHours?.start || '',
              end: data.user.riderProfile?.workingHours?.end || '',
            },
            dayRatePerKm: data.user.riderProfile?.dayRatePerKm || 50,
            nightRatePerKm: data.user.riderProfile?.nightRatePerKm || 75,
            profilePhoto: data.user.riderProfile?.profilePhoto || '',
            profilePhotoPublicId: data.user.riderProfile?.profilePhotoPublicId || '',
            motorcycle: {
              brand: data.user.riderProfile?.motorcycle?.brand || '',
              model: data.user.riderProfile?.motorcycle?.model || '',
              plateNumber: data.user.riderProfile?.motorcycle?.plateNumber || '',
              color: data.user.riderProfile?.motorcycle?.color || '',
              year: data.user.riderProfile?.motorcycle?.year || '',
              photo: data.user.riderProfile?.motorcycle?.photo || '',
              photoPublicId: data.user.riderProfile?.motorcycle?.photoPublicId || '',
            },
          },
        });

        if (data.wallet) {
          setWallet(data.wallet);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchProfile();
    }
  }, [authLoading, user, error]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // Convert numeric fields to numbers
    let processedValue = value;
    if (name === 'dayRatePerKm' || name === 'nightRatePerKm') {
      processedValue = value === '' ? '' : parseFloat(value);
    }
    
    setForm((prev) => ({
      ...prev,
      riderProfile: {
        ...prev.riderProfile,
        [name]: processedValue,
      },
    }));
  };

  const handleWorkingHoursChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      riderProfile: {
        ...prev.riderProfile,
        workingHours: {
          ...prev.riderProfile.workingHours,
          [name]: value,
        },
      },
    }));
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('[RiderProfile] IMAGE SELECTED:', { name: file.name, size: file.size, type: file.type });

    // Validate file
    if (!file.type.startsWith('image/')) {
      console.error('[RiderProfile] Invalid file type:', file.type);
      error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error('[RiderProfile] File too large:', file.size);
      error('Image size should be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      info('Uploading image...');

      console.log('[RiderProfile] Starting upload to Cloudinary...');
      // Use the uploadSingle endpoint
      const response = await uploadAPI.uploadSingle(file);
      console.log('[RiderProfile] UPLOAD RESPONSE:', JSON.stringify(response.data, null, 2));
      
      // Fix: The response structure is { success: true, data: { url: ... } }
      // So we need to access response.data.data.url
      const uploadedData = response.data.data || response.data;
      const imageUrl = uploadedData.url || uploadedData.secure_url;
      const publicId = uploadedData.publicId || null;
      console.log(`[RiderProfile] EXTRACTED ${type.toUpperCase()} PHOTO:`, { imageUrl, publicId });

      if (!imageUrl) {
        console.error('[RiderProfile] No image URL in response:', uploadedData);
        throw new Error('No image URL returned from upload');
      }

      if (type === 'profile') {
        console.log('[RiderProfile] Updating local state with profile photo');
        setForm((prev) => ({
          ...prev,
          riderProfile: {
            ...prev.riderProfile,
            profilePhoto: imageUrl,
            profilePhotoPublicId: publicId,
          },
        }));
        
        // Auto-save to database immediately
        console.log('[RiderProfile] Auto-saving profile photo to database...');
        await riderAPI.updateProfile({
          riderProfile: {
            profilePhoto: imageUrl,
            profilePhotoPublicId: publicId,
          },
        });
        console.log('[RiderProfile] Profile photo saved to database successfully');
        
        // Refresh AuthContext to update sidebar/navbar/dashboard
        console.log('[RiderProfile] Refreshing AuthContext...');
        await refreshProfile();
        console.log('[RiderProfile] AuthContext refreshed');
        
        success('Profile photo updated successfully');
      } else {
        console.log('[RiderProfile] Updating local state with motorcycle photo');
        setForm((prev) => ({
          ...prev,
          riderProfile: {
            ...prev.riderProfile,
            motorcycle: {
              ...prev.riderProfile.motorcycle,
              photo: imageUrl,
              photoPublicId: publicId,
            },
          },
        }));
        
        // Auto-save to database immediately
        console.log('[RiderProfile] Auto-saving motorcycle photo to database...');
        await riderAPI.updateProfile({
          riderProfile: {
            motorcycle: {
              photo: imageUrl,
              photoPublicId: publicId,
            },
          },
        });
        console.log('[RiderProfile] Motorcycle photo saved to database successfully');
        
        success('Motorcycle photo uploaded successfully');
      }
    } catch (error) {
      console.error('[RiderProfile] UPLOAD ERROR:', error);
      console.error('[RiderProfile] Error response:', error.response?.data);
      
      // Specific error messages
      if (error.code === 'ENETDOWN' || error.code === 'ECONNREFUSED') {
        error('Network error while uploading image. Please check your connection.');
      } else if (error.response?.data?.message) {
        error(error.response.data.message);
      } else if (error.message?.includes('Cloudinary')) {
        error('Cloudinary upload failed. Please try again.');
      } else {
        error('Failed to upload image. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    try {
      console.log('[RiderProfile] Removing profile photo...');
      await riderAPI.removeProfilePhoto();
      console.log('[RiderProfile] Profile photo removed from database');
      setForm((prev) => ({
        ...prev,
        riderProfile: {
          ...prev.riderProfile,
          profilePhoto: '',
          profilePhotoPublicId: '',
        },
      }));
      
      // Refresh AuthContext to update sidebar/navbar/dashboard
      console.log('[RiderProfile] Refreshing AuthContext after photo removal...');
      await refreshProfile();
      console.log('[RiderProfile] AuthContext refreshed');
      
      success('Profile photo removed successfully');
    } catch (error) {
      console.error('[RiderProfile] Failed to remove profile photo:', error);
      error(error.response?.data?.message || 'Failed to remove profile photo');
    }
  };

  const handleRemoveMotorcyclePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your motorcycle photo?')) {
      return;
    }

    try {
      console.log('[RiderProfile] Removing motorcycle photo...');
      await riderAPI.removeMotorcyclePhoto();
      console.log('[RiderProfile] Motorcycle photo removed from database');
      setForm((prev) => ({
        ...prev,
        riderProfile: {
          ...prev.riderProfile,
          motorcycle: {
            ...prev.riderProfile.motorcycle,
            photo: '',
            photoPublicId: '',
          },
        },
      }));
      success('Motorcycle photo removed successfully');
    } catch (error) {
      console.error('[RiderProfile] Failed to remove motorcycle photo:', error);
      error(error.response?.data?.message || 'Failed to remove motorcycle photo');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('[RiderProfile] ========== MANUAL SAVE START ==========');
      console.log('[RiderProfile] Sending rider profile update:', JSON.stringify(form, null, 2));
      await riderAPI.updateProfile(form);
      console.log('[RiderProfile] Profile update successful');
      success('Changes saved successfully');
      
      // Refresh profile data
      console.log('[RiderProfile] Fetching updated profile data...');
      const response = await riderAPI.getProfile();
      const data = response.data.data;
      
      setForm({
        name: data.user.name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        avatar: data.user.avatar || '',
        riderProfile: {
          vehicleType: data.user.riderProfile?.vehicleType || '',
          vehicleNumber: data.user.riderProfile?.vehicleNumber || '',
          licenseNumber: data.user.riderProfile?.licenseNumber || '',
          nationalId: data.user.riderProfile?.nationalId || '',
          workingArea: data.user.riderProfile?.workingArea || '',
          workingHours: {
            start: data.user.riderProfile?.workingHours?.start || '',
            end: data.user.riderProfile?.workingHours?.end || '',
          },
          dayRatePerKm: data.user.riderProfile?.dayRatePerKm || 50,
          nightRatePerKm: data.user.riderProfile?.nightRatePerKm || 75,
          profilePhoto: data.user.riderProfile?.profilePhoto || '',
          profilePhotoPublicId: data.user.riderProfile?.profilePhotoPublicId || '',
          motorcycle: {
            brand: data.user.riderProfile?.motorcycle?.brand || '',
            model: data.user.riderProfile?.motorcycle?.model || '',
            plateNumber: data.user.riderProfile?.motorcycle?.plateNumber || '',
            color: data.user.riderProfile?.motorcycle?.color || '',
            year: data.user.riderProfile?.motorcycle?.year || '',
            photo: data.user.riderProfile?.motorcycle?.photo || '',
            photoPublicId: data.user.riderProfile?.motorcycle?.photoPublicId || '',
          },
        },
      });
      
      // Refresh AuthContext to update sidebar/navbar/dashboard
      console.log('[RiderProfile] Refreshing AuthContext after manual save...');
      await refreshProfile();
      console.log('[RiderProfile] AuthContext refreshed');
      console.log('[RiderProfile] ========== MANUAL SAVE COMPLETE ==========');
    } catch (error) {
      console.error('[RiderProfile] Failed to update profile:', error);
      console.error('[RiderProfile] Error response:', error.response?.data);
      error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center gap-6 pb-6 border-b border-neutral-200">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {form.riderProfile.profilePhoto ? (
                <img 
                  src={form.riderProfile.profilePhoto} 
                  alt={form.name}
                  className="w-full h-full object-cover"
                />
              ) : form.avatar ? (
                <img 
                  src={form.avatar} 
                  alt={form.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <button
              onClick={() => profilePhotoInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
              style={{
                background: '#2563EB',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
              }}
              disabled={uploading}
            >
              {uploading ? <LoadingSpinner size="sm" /> : <Camera size={14} />}
            </button>
            {form.riderProfile.profilePhoto && (
              <button
                onClick={handleRemoveProfilePhoto}
                className="absolute top-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                disabled={uploading}
              >
                <X size={14} />
              </button>
            )}
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, 'profile')}
            />
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900">{form.name || 'Rider'}</h1>
            <p className="text-neutral-600">{form.email}</p>
            <p className="text-neutral-600">{form.phone}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                user?.riderProfile?.isOnline 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {user?.riderProfile?.isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                {user?.riderProfile?.status || 'offline'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8 mt-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Full Name</label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                <Input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  fullWidth
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Phone Number</label>
                <Input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleInputChange}
                  placeholder="+254..."
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">National ID</label>
                <Input
                  name="nationalId"
                  value={form.riderProfile.nationalId}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    riderProfile: { ...prev.riderProfile, nationalId: e.target.value }
                  }))}
                  placeholder="National ID number"
                  fullWidth
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="pt-6 border-t border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Bike size={20} />
              Vehicle Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Vehicle Type</label>
                <Input
                  name="vehicleType"
                  value={form.riderProfile.vehicleType}
                  onChange={handleProfileChange}
                  placeholder="e.g., Bodaboda, Motorcycle"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Vehicle Number (License Plate)</label>
                <Input
                  name="vehicleNumber"
                  value={form.riderProfile.vehicleNumber}
                  onChange={handleProfileChange}
                  placeholder="e.g., KBA 123A"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Driving License Number</label>
                <Input
                  name="licenseNumber"
                  value={form.riderProfile.licenseNumber}
                  onChange={handleProfileChange}
                  placeholder="License number"
                  fullWidth
                />
              </div>
            </div>

            {/* Motorcycle Information */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Motorcycle Information</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Brand</label>
                  <Input
                    name="brand"
                    value={form.riderProfile.motorcycle?.brand || ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      riderProfile: {
                        ...prev.riderProfile,
                        motorcycle: { ...prev.riderProfile.motorcycle, brand: e.target.value }
                      }
                    }))}
                    placeholder="e.g., Honda, Yamaha"
                    fullWidth
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Model</label>
                  <Input
                    name="model"
                    value={form.riderProfile.motorcycle?.model || ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      riderProfile: {
                        ...prev.riderProfile,
                        motorcycle: { ...prev.riderProfile.motorcycle, model: e.target.value }
                      }
                    }))}
                    placeholder="e.g., CRF150L"
                    fullWidth
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Plate Number</label>
                  <Input
                    name="plateNumber"
                    value={form.riderProfile.motorcycle?.plateNumber || ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      riderProfile: {
                        ...prev.riderProfile,
                        motorcycle: { ...prev.riderProfile.motorcycle, plateNumber: e.target.value }
                      }
                    }))}
                    placeholder="e.g., KBA 123A"
                    fullWidth
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Color</label>
                  <Input
                    name="color"
                    value={form.riderProfile.motorcycle?.color || ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      riderProfile: {
                        ...prev.riderProfile,
                        motorcycle: { ...prev.riderProfile.motorcycle, color: e.target.value }
                      }
                    }))}
                    placeholder="e.g., Red, Black"
                    fullWidth
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Year</label>
                  <Input
                    name="year"
                    type="number"
                    value={form.riderProfile.motorcycle?.year || ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      riderProfile: {
                        ...prev.riderProfile,
                        motorcycle: { ...prev.riderProfile.motorcycle, year: e.target.value }
                      }
                    }))}
                    placeholder="e.g., 2020"
                    fullWidth
                  />
                </div>
              </div>
            </div>

            {/* Motorcycle Photo */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Motorcycle Photo</label>
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  {form.riderProfile.motorcycle?.photo ? (
                    <img 
                      src={form.riderProfile.motorcycle.photo} 
                      alt="Motorcycle"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Bike className="w-8 h-8 text-gray-400" />
                  )}
                  {form.riderProfile.motorcycle?.photo && (
                    <button
                      type="button"
                      onClick={handleRemoveMotorcyclePhoto}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                      disabled={uploading}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => motorcyclePhotoInputRef.current?.click()}
                    className="btn-outline flex items-center gap-2"
                    disabled={uploading}
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : <Upload size={18} />}
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  <p className="text-sm text-gray-500 mt-1">Max size: 10MB</p>
                  <input
                    ref={motorcyclePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'motorcycle')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Working Area & Hours */}
          <div className="pt-6 border-t border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Working Area & Hours
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Working Area</label>
                <Input
                  name="workingArea"
                  value={form.riderProfile.workingArea}
                  onChange={handleProfileChange}
                  placeholder="e.g., Nairobi, Westlands"
                  fullWidth
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Start Time</label>
                  <Input
                    name="start"
                    type="time"
                    value={form.riderProfile.workingHours.start}
                    onChange={handleWorkingHoursChange}
                    fullWidth
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">End Time</label>
                  <Input
                    name="end"
                    type="time"
                    value={form.riderProfile.workingHours.end}
                    onChange={handleWorkingHoursChange}
                    fullWidth
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rate Settings */}
          <div className="pt-6 border-t border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Rate Settings (per KM)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Day Rate (KES/km)</label>
                <Input
                  name="dayRatePerKm"
                  type="number"
                  value={form.riderProfile.dayRatePerKm}
                  onChange={handleProfileChange}
                  min="0"
                  step="0.01"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Night Rate (KES/km)</label>
                <Input
                  name="nightRatePerKm"
                  type="number"
                  value={form.riderProfile.nightRatePerKm}
                  onChange={handleProfileChange}
                  min="0"
                  step="0.01"
                  fullWidth
                />
              </div>
            </div>
          </div>

          {/* Wallet Summary */}
          <div className="pt-6 border-t border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Earnings Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-green-700">KES {wallet.balance?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600 mb-1">Pending Balance</p>
                <p className="text-2xl font-bold text-orange-700">KES {wallet.pendingBalance?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-blue-700">KES {wallet.totalEarnings?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">Total Withdrawn</p>
                <p className="text-2xl font-bold text-purple-700">KES {wallet.totalWithdrawn?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-neutral-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              <X size={18} />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || uploading}
              isLoading={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RiderProfile;