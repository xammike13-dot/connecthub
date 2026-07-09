import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, uploadAPI, landlordAPI } from '../services/api';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

const LandlordProfile = () => {
  const { user, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
      });
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await landlordAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      addToast('Name is required', 'error');
      return;
    }

    setSaving(true);
    
    try {
      await authAPI.updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        avatar: form.avatar,
      });
      
      await refreshProfile();
      addToast('Profile updated successfully', 'success');
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      addToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
      bio: user?.bio || '',
    });
    setEditing(false);
  };


  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadAPI.uploadSingle(file);
      const imageUrl = response.data?.data?.url || response.data?.url;
      
      if (imageUrl) {
        setForm((prev) => ({
          ...prev,
          avatar: imageUrl,
        }));
        addToast('Avatar uploaded successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      addToast('Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            {form.avatar ? (
              <img 
                src={form.avatar} 
                alt={form.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-100">
                <span className="text-3xl font-bold text-primary-600">
                  {form.name?.charAt(0)?.toUpperCase() || 'L'}
                </span>
              </div>
            )}
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors shadow-lg"
              title="Change profile photo"
            >
              {uploadingAvatar ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-secondary-800">{form.name}</h1>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                Verified Landlord
              </span>
            </div>
            <p className="text-secondary-600 mb-1">{form.email}</p>
            <p className="text-secondary-500 mb-2">{form.phone}</p>
            {form.bio && !editing && (
              <p className="text-secondary-600 italic">"{form.bio}"</p>
            )}
            <p className="text-sm text-secondary-400 mt-2">Member Since: {memberSince}</p>
          </div>
          <div className="flex gap-3">
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                variant="primary"
              >
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={saving}
                  isLoading={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mt-6 pt-6 border-t border-secondary-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Bio</label>
                <input
                  type="text"
                  name="bio"
                  value={form.bio}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Tell tenants about yourself"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Landlord Statistics */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary-800 mb-4">Landlord Statistics</h2>
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary-600">{stats?.totalProperties || 0}</p>
              <p className="text-sm text-secondary-600 mt-1">Properties</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats?.bookedRooms || 0}</p>
              <p className="text-sm text-secondary-600 mt-1">Active Tenants</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats?.totalViews || 0}</p>
              <p className="text-sm text-secondary-600 mt-1">Total Views</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">4.8 ★</p>
              <p className="text-sm text-secondary-600 mt-1">Rating</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">43</p>
              <p className="text-sm text-secondary-600 mt-1">Reviews</p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Information (Read-only) */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary-800 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-secondary-500">Email</p>
              <p className="font-medium text-secondary-800">{form.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-secondary-500">Phone</p>
              <p className="font-medium text-secondary-800">{form.phone}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-secondary-400 mt-4">
          To change email or phone, go to <Link to="/landlord/settings" className="text-primary-600 hover:underline">Settings</Link>
        </p>
      </div>
    </div>
  );
};

export default LandlordProfile;