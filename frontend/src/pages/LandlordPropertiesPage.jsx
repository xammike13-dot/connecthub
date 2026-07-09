import React, { useEffect, useState, useCallback } from 'react';
import { landlordAPI, rentalAPI } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toast';
import PhotoGallery from '../components/ui/PhotoGallery';
import { Image as ImageIcon } from 'lucide-react';

const LandlordPropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await landlordAPI.getMyProperties();
      setProperties(res.data.data || []);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to load properties';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    setDeletingId(id);
    try {
      await rentalAPI.delete(id);
      setProperties((prev) => prev.filter((p) => p._id !== id));
      addToast('Property deleted successfully', 'success');
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to delete property';
      addToast(errorMsg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const res = await rentalAPI.toggleAvailability(id);
      setProperties((prev) =>
        prev.map((p) =>
          p._id === id
            ? res.data.data || { ...p, isAvailable: !currentStatus }
            : p
        )
      );
      const newStatus = currentStatus ? 'unavailable' : 'available';
      addToast(`Property marked as ${newStatus}`, 'success');
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to update status';
      addToast(errorMsg, 'error');
    }
  };

  const handleOpenGallery = (property, index = 0) => {
    const images = property.images || [];
    setGalleryImages(images);
    setGalleryIndex(index);
    setShowGallery(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-500">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={loadProperties}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">My Properties</h1>
          <p className="text-secondary-500 mt-1">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/landlord/properties/new')} variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Property
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary-800 mb-2">No Properties Yet</h3>
          <p className="text-secondary-500 mb-6">Get started by adding your first rental property.</p>
          <Button onClick={() => navigate('/landlord/properties/new')} variant="primary">
            Add Your First Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => {
            const photoCount = p.images?.length || 0;
            const hasMultiplePhotos = photoCount > 1;
            const mainImage = p.images?.[0]?.url || p.images?.[0] || p.image || '/vite.svg';

            return (
              <div key={p._id} className="card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-secondary-100">
                  <img
                    src={mainImage}
                    alt={p.rentalName || p.name || 'Property'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => hasMultiplePhotos && handleOpenGallery(p, 0)}
                    onError={(e) => {
                      e.target.src = '/vite.svg';
                    }}
                  />
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                    p.isAvailable
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {p.isAvailable ? 'Available' : 'Occupied'}
                  </div>

                  {/* Gallery Button */}
                  {hasMultiplePhotos && (
                    <button
                      onClick={() => handleOpenGallery(p, 0)}
                      className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-black/70 transition-colors flex items-center gap-1"
                    >
                      <ImageIcon size={14} />
                      {photoCount} Photos
                    </button>
                  )}
                </div>

              <div className="p-4">
                <h3 className="font-semibold text-lg text-secondary-800 mb-1">
                  {p.rentalName || p.name || 'Untitled Property'}
                </h3>
                <p className="text-sm text-secondary-500 mb-3 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {p.location ? p.location.charAt(0).toUpperCase() + p.location.slice(1) : 'No location'}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-bold text-primary-600">
                    KES {p.monthlyPrice?.toLocaleString() || p.price?.toLocaleString() || '0'}/month
                  </p>
                  <span className="text-xs text-secondary-400 capitalize">
                    {p.rentalType ? p.rentalType.replace('-', ' ') : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/landlord/properties/${p._id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/landlord/properties/${p._id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant={p.isAvailable ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggle(p._id, p.isAvailable)}
                  >
                    {p.isAvailable ? 'Mark Occupied' : 'Mark Vacant'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(p._id)}
                    disabled={deletingId === p._id}
                  >
                    {deletingId === p._id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Photo Gallery */}
      <PhotoGallery
        images={galleryImages}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
};

export default LandlordPropertiesPage;