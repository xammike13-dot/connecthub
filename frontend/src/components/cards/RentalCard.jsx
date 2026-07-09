import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Heart,
  Home,
  Eye,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import PhotoGallery from '../ui/PhotoGallery';
import Avatar from '../ui/Avatar';

const RentalCard = ({
  rental,
  onFavorite,
  isFavorite = false,
  onView,
  isViewed = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const {
    _id,
    rentalName,
    rentalType,
    monthlyPrice,
    location,
    images,
    landlord,
    amenities,
    isAvailable,
    views,
    favoritesCount,
  } = rental;

  // Handle both old (string) and new (object) image formats
  const mainImage = images?.[0]
    ? typeof images[0] === 'string'
      ? images[0]
      : images[0]?.url || 'https://via.placeholder.com/400x300?text=Rental'
    : 'https://via.placeholder.com/400x300?text=Rental';

  const photoCount = images?.length || 0;
  const hasMultiplePhotos = photoCount > 1;

  const handleOpenGallery = (index = 0) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-xl overflow-hidden border border-neutral-200 shadow-md hover:border-blue-400 hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <img
          src={mainImage}
          alt={rentalName}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => setImageLoaded(true)}
          onClick={() => hasMultiplePhotos && handleOpenGallery(0)}
        />

        {/* Gallery Button Overlay */}
        {hasMultiplePhotos && (
          <button
            onClick={() => handleOpenGallery(0)}
            className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/70 transition-colors flex items-center gap-1"
          >
            <ImageIcon size={16} />
            {photoCount} Photos
          </button>
        )}

        {/* Availability */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded shadow-md ${isAvailable
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
              }`}
          >
            {isAvailable ? 'Available' : 'Occupied'}
          </span>
        </div>

        {/* Rental Type */}
        <div className="absolute top-3 left-20">
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded border border-blue-200 capitalize">
            {rentalType}
          </span>
        </div>

        {/* Favorite */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onFavorite?.(_id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-neutral-500 hover:bg-white transition-all duration-200 backdrop-blur-sm shadow-md"
        >
          <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} className={isFavorite ? 'text-red-500' : ''} />
        </button>

        {/* Price */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded shadow-md">
            KSh {monthlyPrice?.toLocaleString()}/month
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Link to={`/rentals/detail/${_id}`}>
          <h3 className="font-semibold text-neutral-900 text-lg hover:text-blue-600 transition-colors">
            {rentalName}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-neutral-500 mt-1">
          <MapPin size={14} />
          <span className="text-sm">{location}</span>
        </div>

        {/* Views and Favorites */}
        <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400">
          <div className="flex items-center gap-1">
            <Eye size={14} />
            <span>{views || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={14} fill={isFavorite ? '#ef4444' : 'none'} className={isFavorite ? 'text-red-500' : ''} />
            <span>{favoritesCount || 0}</span>
          </div>
        </div>

        {/* Amenities */}
        {amenities?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded border border-neutral-200"
              >
                {amenity}
              </span>
            ))}

            {amenities.length > 3 && (
              <span className="text-xs text-neutral-400">+{amenities.length - 3} more</span>
            )}
          </div>
        )}

        {/* Landlord and Actions */}
        {landlord && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-200">
            <Avatar
              src={landlord.avatar}
              alt={landlord.name}
              size="sm"
            />

            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-700">{landlord.name}</p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isViewed ? 'primary' : 'outline'}
                onClick={() => onView?.(_id)}
              >
                <Eye size={14} /> {isViewed ? 'Viewed' : 'View'}
              </Button>
              {isAvailable && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!user) {
                      navigate('/login', { state: { from: `/rentals/${_id}` } });
                      return;
                    }
                    navigate(`/checkout/rental/${_id}`);
                  }}
                >
                  <Zap size={14} /> Book
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Photo Gallery */}
      <PhotoGallery
        images={images}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        initialIndex={galleryIndex}
      />
    </motion.div>
  );
};

export default RentalCard;