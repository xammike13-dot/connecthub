import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiClient';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toast';
import { Image as ImageIcon, Plus, Trash2, Edit3, Eye, Loader2 } from 'lucide-react';

const CaretakerPropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/rentals/my-rentals');
      setProperties(data.data || []);
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
      await api.delete(`/rentals/${id}`);
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
      const res = await api.patch(`/rentals/${id}/toggle-availability`);
      setProperties((prev) =>
        prev.map((p) =>
          p._id === id
            ? res.data.data || { ...p, isAvailable: !currentStatus }
            : p
        )
      );
      const newStatus = !currentStatus ? 'available' : 'unavailable';
      addToast(`Property marked as ${newStatus}`, 'success');
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to update status';
      addToast(errorMsg, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
          <p className="text-neutral-500">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={loadProperties} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Assigned Properties</h1>
          <p className="text-neutral-500 text-sm mt-1">
            You are managing {properties.length} {properties.length === 1 ? 'property' : 'properties'} for your landlord.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/caretaker/properties/new')} variant="primary">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Property
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">No Properties Assigned Yet</h3>
          <p className="text-neutral-500 mb-6 text-sm">Create properties under your assigned landlord to begin.</p>
          <Button onClick={() => navigate('/caretaker/properties/new')} variant="primary">
            Add Your First Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => {
            const photoCount = p.images?.length || 0;
            const mainImage = p.images?.[0]?.url || p.images?.[0] || '/vite.svg';

            return (
              <div key={p._id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between shadow-sm">
                <div>
                  <div className="relative h-48 bg-slate-50">
                    <img
                      src={mainImage}
                      alt={p.rentalName || 'Property'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/vite.svg';
                      }}
                    />
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      p.isAvailable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {p.isAvailable ? 'Available' : 'Occupied'}
                    </div>

                    {photoCount > 0 && (
                      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <ImageIcon size={12} />
                        {photoCount} Photos
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-extrabold text-lg text-neutral-900 leading-tight">
                      {p.rentalName || 'Untitled Property'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 capitalize">
                      {p.location ? p.location : 'Unknown location'} • {p.rentalType?.replace('-', ' ')}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-base font-black text-blue-600">
                        KSh {p.monthlyPrice?.toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/caretaker/properties/${p._id}`)}
                    className="flex-1 min-w-[60px]"
                  >
                    <Eye size={13} className="mr-1" /> View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/caretaker/properties/${p._id}/edit`)}
                    className="flex-1 min-w-[60px]"
                  >
                    <Edit3 size={13} className="mr-1" /> Edit
                  </Button>
                  <Button
                    variant={p.isAvailable ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggle(p._id, p.isAvailable)}
                    className="flex-1 min-w-[90px]"
                  >
                    {p.isAvailable ? 'Occupied' : 'Vacant'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(p._id)}
                    disabled={deletingId === p._id}
                    className="flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CaretakerPropertiesPage;
