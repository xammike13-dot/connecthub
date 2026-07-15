import React, { useState } from 'react';
import { rentalAPI, uploadAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toast';

const LOCATIONS = [
  { value: 'stage', label: 'Stage' },
  { value: 'mabs', label: 'Mabs' },
  { value: 'cheba', label: 'Cheba' },
  { value: 'kesses', label: 'Kesses' },
];

const ROOM_TYPES = [
  { value: 'single', label: 'Single Room' },
  { value: 'bedsitter', label: 'Bedsitter' },
  { value: 'one-bedroom', label: 'One Bedroom' },
  { value: 'two-bedroom', label: 'Two Bedroom' },
  { value: 'three-bedroom', label: 'Three Bedroom' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'commercial', label: 'Commercial Space' },
];

const AMENITIES = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'security', label: 'Security' },
  { value: 'parking', label: 'Parking' },
  { value: 'balcony', label: 'Balcony' },
];

const LandlordPropertyNew = () => {
  const [form, setForm] = useState({
    rentalName: '',
    rentalType: '',
    monthlyPrice: '',
    location: '',
    amenities: [],
    description: '',
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleAmenityChange = (amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.rentalName.trim()) {
      newErrors.rentalName = 'Property name is required';
    }

    if (!form.rentalType) {
      newErrors.rentalType = 'Room type is required';
    }

    if (!form.monthlyPrice || parseFloat(form.monthlyPrice) <= 0) {
      newErrors.monthlyPrice = 'Valid monthly price is required';
    }

    if (!form.location) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // Ensure images are in correct format: [{ url, publicId }]
      const formattedImages = images.map(img => {
        if (typeof img === 'string') {
          return { url: img, publicId: null };
        }
        return img;
      });

      const payload = {
        rentalName: form.rentalName.trim(),
        rentalType: form.rentalType,
        monthlyPrice: parseFloat(form.monthlyPrice),
        location: form.location,
        amenities: form.amenities,
        description: form.description.trim(),
        images: formattedImages,
      };

      console.log('[LandlordPropertyNew] Creating rental with images:', formattedImages);
      await rentalAPI.create(payload);
      addToast('Property created successfully', 'success');
      navigate('/landlord/properties');
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to create property';
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/landlord/properties')}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">Add New Property</h1>
          <p className="text-secondary-500">Fill in the details to list a new rental property</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Property Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rentalName"
                value={form.rentalName}
                onChange={handleChange}
                className={`input-field ${errors.rentalName ? 'border-red-500' : ''}`}
                placeholder="e.g., Sunrise Apartments"
              />
              {errors.rentalName && (
                <p className="mt-1 text-sm text-red-500">{errors.rentalName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Room Type <span className="text-red-500">*</span>
              </label>
              <select
                name="rentalType"
                value={form.rentalType}
                onChange={handleChange}
                className={`input-field ${errors.rentalType ? 'border-red-500' : ''}`}
              >
                <option value="">Select room type</option>
                {ROOM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.rentalType && (
                <p className="mt-1 text-sm text-red-500">{errors.rentalType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Monthly Price (KES) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="monthlyPrice"
                value={form.monthlyPrice}
                onChange={handleChange}
                className={`input-field ${errors.monthlyPrice ? 'border-red-500' : ''}`}
                placeholder="e.g., 15000"
                min="0"
              />
              {errors.monthlyPrice && (
                <p className="mt-1 text-sm text-red-500">{errors.monthlyPrice}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <select
                name="location"
                value={form.location}
                onChange={handleChange}
                className={`input-field ${errors.location ? 'border-red-500' : ''}`}
              >
                <option value="">Select location</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input-field"
              rows="4"
              placeholder="Describe the property features, nearby amenities, etc."
            />
          </div>
        </div>

        {/* Amenities */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AMENITIES.map((amenity) => (
              <label
                key={amenity.value}
                className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-secondary-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form.amenities.includes(amenity.value)}
                  onChange={() => handleAmenityChange(amenity.value)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-secondary-700">{amenity.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Property Images</h2>
          <p className="text-sm text-secondary-500 mb-4">
            Upload images of the property. The first image will be used as the main display image.
          </p>
          <ImageUpload
            multiple={true}
            maxFiles={5}
            onUpload={(imgs) => setImages(Array.isArray(imgs) ? imgs : [imgs])}
            onUploadStateChange={setUploading}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" isLoading={loading || uploading} disabled={uploading} variant="primary">
            {uploading ? 'Uploading Images...' : 'Create Property'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/landlord/properties')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LandlordPropertyNew;