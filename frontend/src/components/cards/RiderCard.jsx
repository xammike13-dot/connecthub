import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  MapPin, 
  Phone, 
  MessageCircle,
  BadgeCheck,
  Bike,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Button from '../ui/Button';

const RiderCard = ({ 
  rider, 
  onSelect,
  showContact = false,
  canContact = false,
  onContact,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    _id,
    name,
    avatar,
    rating,
    reviewCount,
    riderProfile,
    isOnline,
    currentLocation,
    totalRides,
    phone,
    distance,
  } = rider;

  const riderAvatar = avatar || 'https://via.placeholder.com/100x100?text=R';
  const vehicleType = riderProfile?.vehicleType || 'Motorcycle';
  const vehicleNumber = riderProfile?.vehicleNumber || 'N/A';
  const isVerified = rider?.isVerified || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={riderAvatar}
            alt={name}
            className={`w-14 h-14 rounded-full object-cover ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {/* Online Status */}
          <span
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name & Verified Badge */}
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 line-clamp-1">{name}</h4>
            {isVerified && (
              <BadgeCheck size={14} className="text-blue-500" />
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="text-sm font-medium text-gray-700">
              {rating?.toFixed(1) || '0.0'}
            </span>
            {reviewCount > 0 && (
              <span className="text-xs text-gray-500">({reviewCount})</span>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <Bike size={14} />
            <span>{vehicleType}</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs">{vehicleNumber}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" />
              <span>{totalRides || 0} trips</span>
            </div>
            {distance && (
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-blue-500" />
                <span>{distance.toFixed(1)} km away</span>
              </div>
            )}
          </div>

          {/* Location */}
          {currentLocation && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin size={12} />
              <span className="line-clamp-1">
                {currentLocation.address || 'Current location'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        {onSelect && (
          <Button
            size="sm"
            variant="primary"
            fullWidth
            onClick={() => onSelect(rider)}
            isDisabled={!isOnline}
          >
            {isOnline ? 'Book Ride' : 'Offline'}
          </Button>
        )}
        
        {showContact && canContact && onContact && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContact('phone')}
              className="flex-1"
            >
              <Phone size={14} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContact('message')}
              className="flex-1"
            >
              <MessageCircle size={14} />
            </Button>
          </>
        )}

        {showContact && !canContact && (
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg flex items-center justify-center gap-1">
              <AlertCircle size={12} />
              Pay to unlock contact
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RiderCard;