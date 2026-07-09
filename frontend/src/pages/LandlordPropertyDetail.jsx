import React, { useEffect, useState } from 'react';
import { rentalAPI } from '../services/api';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

const LandlordPropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadRental = async () => {
      try {
        const res = await rentalAPI.getById(id);
        if (mounted) setRental(res.data.data);
      } catch (err) {
        const errorMsg = err?.response?.data?.message || err.message || 'Failed to load property';
        addToast(errorMsg, 'error');
        navigate('/landlord/properties');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadRental();
    return () => { mounted = false; };
  }, [id, navigate, addToast]);

  const handleToggle = async () => {
    if (!rental) return;
    setToggling(true);
    try {
      const res = await rentalAPI.toggleAvailability(id);
      setRental(res.data.data || { ...rental, isAvailable: !rental.isAvailable });
      const newStatus = rental.isAvailable ? 'occupied' : 'vacant';
      addToast(`Property marked as ${newStatus}`, 'success');
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to update status';
      addToast(errorMsg, 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      await rentalAPI.delete(id);
      addToast('Property deleted successfully', 'success');
      navigate('/landlord/properties');
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to delete property';
      addToast(errorMsg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getLocationLabel = (location) => {
    if (!location) return 'No location';
    return location.charAt(0).toUpperCase() + location.slice(1);
  };

  const getRoomTypeLabel = (type) => {
    if (!type) return 'No type';
    return type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-500 mb-4">Property not found</p>
          <Button onClick={() => navigate('/landlord/properties')}>
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/landlord/properties')}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">
              {rental.rentalName || rental.name || 'Untitled Property'}
            </h1>
            <p className="text-secondary-500 flex items-center gap-1 mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {getLocationLabel(rental.location)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/landlord/properties/${id}/edit`)}>
            Edit
          </Button>
          <Button
            variant={rental.isAvailable ? 'danger' : 'success'}
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? 'Updating...' : rental.isAvailable ? 'Mark Occupied' : 'Mark Vacant'}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="card overflow-hidden">
            {rental.images && rental.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                {rental.images.map((img, index) => (
                  <img
                    key={index}
                    src={img.url || img}
                    alt={`${rental.rentalName} - Image ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      e.target.src = '/vite.svg';
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-64 bg-secondary-100 flex items-center justify-center">
                <svg className="w-16 h-16 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">Description</h2>
            <p className="text-secondary-600 whitespace-pre-line">
              {rental.description || 'No description provided.'}
            </p>
          </div>

          {/* Amenities */}
          {rental.amenities && rental.amenities.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary-800 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {rental.amenities.map((amenity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-secondary-50 rounded-lg"
                  >
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-secondary-700 capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Price Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                rental.isAvailable
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {rental.isAvailable ? 'Available' : 'Occupied'}
              </span>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-secondary-500 mb-1">Monthly Price</p>
              <p className="text-3xl font-bold text-primary-600">
                KES {rental.monthlyPrice?.toLocaleString() || rental.price?.toLocaleString() || '0'}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-secondary-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-500">Room Type</span>
                <span className="text-sm font-medium text-secondary-800">
                  {getRoomTypeLabel(rental.rentalType)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-500">Location</span>
                <span className="text-sm font-medium text-secondary-800">
                  {getLocationLabel(rental.location)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-500">Views</span>
                <span className="text-sm font-medium text-secondary-800">
                  {rental.views || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/landlord/properties/${id}/edit`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-secondary-700">Edit Property</span>
              </Link>
              
              <button
                onClick={handleToggle}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary-50 transition-colors w-full text-left"
              >
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-secondary-700">
                  {rental.isAvailable ? 'Mark as Occupied' : 'Mark as Vacant'}
                </span>
              </button>

              <Link
                to="/landlord/properties"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-secondary-700">View All Properties</span>
              </Link>
            </div>
          </div>

          {/* Property Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-4">Property Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Created</span>
                <span className="text-secondary-700">{formatDate(rental.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Last Updated</span>
                <span className="text-secondary-700">{formatDate(rental.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Property ID</span>
                <span className="text-secondary-700 font-mono text-xs">
                  {rental._id?.slice(-8).toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordPropertyDetail;