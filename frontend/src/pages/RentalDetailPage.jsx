import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Home,
  Heart,
  Eye,
  Zap,
  ArrowLeft,
  Calendar,
  User,
  Check,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import PhotoGallery from '../components/ui/PhotoGallery';
import Avatar from '../components/ui/Avatar';
import OptimizedImage from '../components/ui/OptimizedImage';
import { rentalAPI } from '../services/api';
import { useToast } from '../components/Toast';

const RentalDetailPage = () => {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { error: toastError } = useToast();
  
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    fetchRental();
  }, [rentalId]);

  const fetchRental = async () => {
    try {
      setLoading(true);
      const response = await rentalAPI.getById(rentalId);
      const rentalData = response.data?.data;
      setRental(rentalData);
      setIsFavorite(rentalData?.isFavorited || false);
    } catch (err) {
      console.error('Failed to fetch rental:', err);
      setError('Failed to load rental details');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/rentals/${rentalId}` } });
      return;
    }

    try {
      const response = await rentalAPI.toggleFavorite(rentalId);
      const isFav = response.data?.isFavorite;
      setIsFavorite(isFav);
      await toggleWishlist(rentalId, 'rental');
      
      // Update local rental data
      if (response.data?.data) {
        setRental(prev => ({
          ...prev,
          isFavorited: isFav,
          favoritesCount: response.data.data.favoritesCount
        }));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toastError('Failed to update favorite. Please try again.');
    }
  };

  const handleBook = () => {
    if (!user) {
      navigate('/login', { state: { from: `/rentals/${rentalId}` } });
      return;
    }
    navigate(`/checkout/rental/${rentalId}`);
  };

  const handleOpenGallery = (index = 0) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Rental not found'}</p>
          <Button onClick={() => navigate('/rentals')}>Back to Rentals</Button>
        </div>
      </div>
    );
  }

  // Handle both old (string) and new (object) image formats
  const mainImage = rental.images?.[0]
    ? typeof rental.images[0] === 'string'
      ? rental.images[0]
      : rental.images[0]?.url || 'https://via.placeholder.com/800x600?text=Rental'
    : 'https://via.placeholder.com/800x600?text=Rental';

  const photoCount = rental.images?.length || 0;
  const hasMultiplePhotos = photoCount > 1;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/rentals')}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Rentals</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
            >
              <div className="relative cursor-pointer" onClick={() => handleOpenGallery(0)}>
                <OptimizedImage
                  src={mainImage}
                  alt={rental.rentalName}
                  priority={true} // Eager load above-the-fold detail hero image
                  aspectRatioClass="aspect-[16/9]"
                  className="w-full h-96 object-cover"
                />

                {/* Gallery Button */}
                {hasMultiplePhotos && (
                  <button
                    onClick={() => handleOpenGallery(0)}
                    className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/70 transition-colors flex items-center gap-2"
                  >
                    <ImageIcon size={18} />
                    View Gallery ({photoCount})
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {hasMultiplePhotos && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {rental.images.map((image, index) => {
                    const thumbUrl = typeof image === 'string'
                      ? image
                      : image?.url || image?.secure_url || '';
                    return (
                      <button
                        key={index}
                        onClick={() => handleOpenGallery(index)}
                        className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                          index === 0
                            ? 'border-blue-500'
                            : 'border-neutral-300 hover:border-blue-400'
                        }`}
                      >
                        <OptimizedImage
                          src={thumbUrl}
                          alt={`Thumbnail ${index + 1}`}
                          priority={false}
                          aspectRatioClass="aspect-square"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Rental Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 mb-2">{rental.rentalName}</h1>
                  <div className="flex items-center gap-2 text-neutral-500">
                    <MapPin size={16} />
                    <span className="capitalize">{rental.location}</span>
                  </div>
                </div>
                <button
                  onClick={handleFavorite}
                  className="p-3 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  <Heart
                    size={24}
                    fill={isFavorite ? '#ef4444' : 'none'}
                    className={isFavorite ? 'text-red-500' : 'text-neutral-500'}
                  />
                </button>
              </div>

              <div className="flex items-center gap-6 mb-6 text-sm">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Eye size={16} />
                  <span>{rental.views || 0} views</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} className={isFavorite ? 'text-red-500' : ''} />
                  <span>{rental.favoritesCount || 0} favorites</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded capitalize">
                  {rental.rentalType}
                </span>
                <span className={`text-sm font-semibold px-3 py-1 rounded ${
                  rental.isAvailable ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {rental.isAvailable ? 'Available' : 'Occupied'}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Description</h3>
                <p className="text-neutral-600">{rental.description || 'No description available.'}</p>
              </div>

              {rental.amenities?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {rental.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="bg-neutral-100 text-neutral-700 text-sm px-3 py-1 rounded capitalize border border-neutral-200"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Landlord Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Landlord</h3>
              <div className="flex items-center gap-4">
                <Avatar
                  src={rental.landlord?.avatar}
                  alt={rental.landlord?.name || 'Unknown'}
                  size="lg"
                />
                <div>
                  <p className="font-medium text-neutral-900">{rental.landlord?.name || 'Unknown'}</p>
                  <p className="text-sm text-neutral-500">{rental.landlord?.email || ''}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm sticky top-24"
            >
              <div className="mb-6">
                <p className="text-neutral-500 text-sm mb-1">Monthly Rent</p>
                <p className="text-3xl font-bold text-neutral-900">
                  KSh {rental.monthlyPrice?.toLocaleString()}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Check size={16} className="text-green-500" />
                  <span>Secure payment</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Check size={16} className="text-green-500" />
                  <span>Verified landlord</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Check size={16} className="text-green-500" />
                  <span>Move-in confirmation required</span>
                </div>
              </div>

              {rental.isAvailable ? (
                <Button
                  fullWidth
                  onClick={handleBook}
                  className="w-full"
                >
                  <Zap size={18} className="mr-2" />
                  Book Now
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outline"
                  disabled
                  className="w-full"
                >
                  <X size={18} className="mr-2" />
                  Currently Occupied
                </Button>
              )}

              <div className="mt-4 text-center text-sm text-neutral-500">
                <p>Payment is held in escrow until move-in is confirmed</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery
        images={rental.images}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
};

export default RentalDetailPage;
