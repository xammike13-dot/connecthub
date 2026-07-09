import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { businessAPI, uploadAPI } from '../services/api';
import { useToast } from '../components/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';

const BusinessProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessDescription: '',
    businessAddress: '',
    businessCategory: '',
    businessLocation: '',
    businessLogo: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await businessAPI.getProfile();
      setProfile(data.data.user);
      setWallet(data.data.wallet);
      
      // Populate form with existing data
      setFormData({
        name: data.data.user.name || '',
        email: data.data.user.email || '',
        phone: data.data.user.phone || '',
        businessName: data.data.user.businessProfile?.businessName || '',
        businessDescription: data.data.user.businessProfile?.businessDescription || '',
        businessAddress: data.data.user.businessProfile?.businessAddress || '',
        businessCategory: data.data.user.businessProfile?.businessCategory || '',
        businessLocation: data.data.user.businessProfile?.businessLocation || '',
        businessLogo: data.data.user.businessProfile?.businessLogo || data.data.user.avatar || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      addToast('Failed to fetch profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Invalid email format';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        businessName: formData.businessName,
        businessDescription: formData.businessDescription,
        businessAddress: formData.businessAddress,
        businessCategory: formData.businessCategory,
        businessLocation: formData.businessLocation,
        businessLogo: formData.businessLogo,
        avatar: formData.businessLogo, // Also update avatar
      };

      const { data } = await businessAPI.updateProfile(updateData);
      
      // Update auth context with new user data
      if (updateUser) {
        updateUser(data.data);
      }
      
      addToast('Profile updated successfully', 'success');
      fetchProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (url) => {
    setFormData((prev) => ({
      ...prev,
      businessLogo: Array.isArray(url) ? url[0] : url,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-800">Business Profile</h1>
        <p className="text-secondary-500 mt-1">Manage your business information</p>
      </div>

      {/* Logo Section */}
      <div className="mb-8 flex items-center gap-6">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-white shadow-lg overflow-hidden border-4 border-white">
            {formData.businessLogo ? (
              <img
                src={formData.businessLogo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary-100">
                <span className="text-4xl font-bold text-secondary-400">
                  {formData.businessName?.charAt(0) || formData.name?.charAt(0) || 'B'}
                </span>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0">
            <label className="cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center hover:bg-primary-700 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setUploading(true);
                    try {
                      console.log('[BusinessProfilePage] Uploading logo...');
                      const response = await uploadAPI.uploadSingle(file);
                      console.log('[BusinessProfilePage] Upload response:', response.data);
                      const imageUrl = response.data?.data?.url || response.data?.url;
                      console.log('[BusinessProfilePage] Extracted image URL:', imageUrl);
                      handleLogoUpload(imageUrl);
                      addToast('Business logo uploaded successfully', 'success');
                    } catch (err) {
                      console.error('[BusinessProfilePage] Upload error:', err);
                      addToast('Failed to upload image', 'error');
                    } finally {
                      setUploading(false);
                    }
                  }
                }}
              />
            </label>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-secondary-800">Business Logo</h2>
          <p className="text-sm text-secondary-500 mt-1">Click the camera icon to upload your business logo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            <h2 className="text-xl font-semibold text-secondary-800">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Full Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                  fullWidth
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  fullWidth
                />
                {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Phone Number *</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  fullWidth
                />
                {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Business Name</label>
                <Input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Enter your business name"
                  fullWidth
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Business Description</label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessDescription: e.target.value }))}
                placeholder="Describe your business..."
                rows={4}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Business Category</label>
                <select
                  value={formData.businessCategory}
                  onChange={(e) => setFormData((prev) => ({ ...prev, businessCategory: e.target.value }))}
                  className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select category</option>
                  <option value="Food Stuffs">Food Stuffs</option>
                  <option value="Households">Households</option>
                  <option value="Gas">Gas</option>
                  <option value="Wines & Spirits">Wines & Spirits</option>
                  <option value="House Shopping">House Shopping</option>
                  <option value="Health Care">Health Care</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Business Location</label>
                <Input
                  type="text"
                  value={formData.businessLocation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, businessLocation: e.target.value }))}
                  placeholder="Enter business location"
                  fullWidth
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Business Address</label>
              <Input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessAddress: e.target.value }))}
                placeholder="Enter business address"
                fullWidth
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-secondary-200">
              <Button type="submit" variant="primary" isLoading={saving || uploading}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar - Business Stats */}
        <div className="space-y-6">
          {/* Business Info Card */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">Business Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-secondary-500">Total Products</p>
                <p className="text-2xl font-bold text-secondary-800">
                  {profile?.businessProfile?.totalProducts || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Total Orders</p>
                <p className="text-2xl font-bold text-secondary-800">
                  {profile?.businessProfile?.totalOrders || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Rating</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-secondary-800">
                    {profile?.businessProfile?.rating?.toFixed(1) || '0.0'}
                  </span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(profile?.businessProfile?.rating || 0)
                            ? 'text-yellow-400'
                            : 'text-secondary-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Summary */}
          {wallet && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-secondary-800 mb-4">Wallet Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-500">Available Balance</span>
                  <span className="font-semibold text-green-600">
                    KES {wallet.balance?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-500">Pending</span>
                  <span className="font-semibold text-yellow-600">
                    KES {wallet.pendingBalance?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-500">Total Earnings</span>
                  <span className="font-semibold text-blue-600">
                    KES {wallet.totalEarnings?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-500">Withdrawn</span>
                  <span className="font-semibold text-secondary-800">
                    KES {wallet.totalWithdrawn?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">Account Info</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-secondary-500">Member Since</p>
                <p className="font-medium text-secondary-800">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Account Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Role</p>
                <p className="font-medium text-secondary-800 capitalize">{profile?.role || 'Business'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfilePage;