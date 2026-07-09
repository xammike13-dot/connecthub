import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Timer, 
  DollarSign,
  Bike,
  Phone,
  MessageCircle,
  Share2,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import LeafletMap, { fallbackLocations } from './LeafletMap';
import { isValidLatLng } from '../../utils/mapValidation';
import { formatDistance, formatFare } from '../../utils/distanceFormatter';

/**
 * RouteDisplay Component
 * Shows the route from pickup to dropoff with estimated time and cost
 * Used during active ride tracking
 */
const RouteDisplay = ({
  pickupLocation,
  dropoffLocation,
  riderLocation = null,
  rider = null,
  routeCoordinates = null,
  estimatedTime = null,
  estimatedDistance = null,
  estimatedPrice = null,
  rideStatus = 'pending', // pending, arriving, inProgress, completed, cancelled
  onContactRider = null,
  onShareRide = null,
  onCancelRide = null,
  onConfirmCompletion = null,
  isLoading = false,
  error = null,
  height = '400px',
  isConfirming = false,
}) => {
  const [mapCenter, setMapCenter] = useState(
    pickupLocation && isValidLatLng(pickupLocation.lat, pickupLocation.lng)
      ? [pickupLocation.lat, pickupLocation.lng]
      : fallbackLocations.nairobi
  );

  useEffect(() => {
    if (pickupLocation && isValidLatLng(pickupLocation.lat, pickupLocation.lng)) {
      setMapCenter([pickupLocation.lat, pickupLocation.lng]);
    }
  }, [pickupLocation]);

  // Calculate bounds to fit both pickup and dropoff
  const fitBounds = () => {
    if (pickupLocation && dropoffLocation && 
        isValidLatLng(pickupLocation.lat, pickupLocation.lng) &&
        isValidLatLng(dropoffLocation.lat, dropoffLocation.lng)) {
      const latCenter = (pickupLocation.lat + dropoffLocation.lat) / 2;
      const lngCenter = (pickupLocation.lng + dropoffLocation.lng) / 2;
      setMapCenter([latCenter, lngCenter]);
    }
  };

  // Status messages
  const statusMessages = {
    pending: {
      text: 'Waiting for rider to accept...',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: <Clock className="text-yellow-500" size={20} />,
    },
    arriving: {
      text: 'Rider is on the way to pickup',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: <Bike className="text-blue-500" size={20} />,
    },
    inProgress: {
      text: 'Ride in progress',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: <Navigation className="text-green-500" size={20} />,
    },
    completed: {
      text: 'Ride completed',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: <CheckCircle className="text-green-500" size={20} />,
    },
    cancelled: {
      text: 'Ride cancelled',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: <AlertCircle className="text-red-500" size={20} />,
    },
  };

  const currentStatus = statusMessages[rideStatus] || statusMessages.pending;

  // Create markers for the map
  const markers = [];
  
  // Add rider location marker if available and valid
  if (riderLocation && isValidLatLng(riderLocation.lat, riderLocation.lng)) {
    markers.push({
      id: 'rider',
      lat: riderLocation.lat,
      lng: riderLocation.lng,
      isOnline: true,
      popupContent: (
        <div className="p-2">
          <div className="flex items-center gap-2">
            <Bike className="text-blue-500" size={16} />
            <span className="font-semibold">Your Rider</span>
          </div>
          {rider && (
            <div className="text-sm text-gray-500 mt-1">
              <p>{rider.name}</p>
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Status Banner */}
      <div className={`p-4 ${currentStatus.bgColor} border-b`}>
        <div className="flex items-center gap-3">
          {currentStatus.icon}
          <div className="flex-1">
            <p className={`font-semibold ${currentStatus.color}`}>
              {currentStatus.text}
            </p>
            {estimatedTime && rideStatus === 'inProgress' && (
              <p className="text-sm text-gray-600">
                ETA: {estimatedTime} mins
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Route Info */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-4">
          {/* Route line with dots */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-0.5 h-16 bg-gradient-to-b from-green-500 to-red-500" />
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </div>

          {/* Location details */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pickup</p>
              <p className="font-medium text-gray-900">
                {pickupLocation?.name || pickupLocation?.address || 'Pickup location'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Dropoff</p>
              <p className="font-medium text-gray-900">
                {dropoffLocation?.name || dropoffLocation?.address || 'Dropoff location'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Details */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <Timer size={14} />
            <span className="text-xs">Time</span>
          </div>
          <p className="font-semibold text-gray-900">{estimatedTime || '--'} min</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <Navigation size={14} />
            <span className="text-xs">Distance</span>
          </div>
          {/* Use formatDistance for proper formatting based on meters */}
          <p className="font-semibold text-gray-900">
            {estimatedDistance !== null && estimatedDistance !== undefined 
              ? formatDistance(parseFloat(estimatedDistance) * 1000) 
              : (estimatedDistance !== null && estimatedDistance !== undefined 
                ? estimatedDistance 
                : '--')}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <DollarSign size={14} />
            <span className="text-xs">Fare</span>
          </div>
          <p className="font-semibold text-green-600">
            {estimatedPrice !== null && estimatedPrice !== undefined 
              ? `KSh ${Math.round(estimatedPrice).toLocaleString('en-KE')}` 
              : '--'}
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{ height }}>
        <LeafletMap
          center={mapCenter}
          zoom={13}
          markers={markers}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          routeCoordinates={routeCoordinates}
          showUserLocation={!!pickupLocation}
          userLocation={pickupLocation}
          height="100%"
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Rider Info (if available) */}
      {rider && (rideStatus === 'arriving' || rideStatus === 'inProgress') && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <img
              src={rider.avatar || 'https://via.placeholder.com/50'}
              alt={rider.name}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{rider.name}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{rider.riderProfile?.vehicleType || 'Motorcycle'}</span>
                <span>•</span>
                <span>{rider.riderProfile?.vehicleNumber || 'N/A'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onContactRider && (
                <button
                  onClick={() => onContactRider('phone')}
                  className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                >
                  <Phone size={20} />
                </button>
              )}
              {onContactRider && (
                <button
                  onClick={() => onContactRider('message')}
                  className="p-3 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                >
                  <MessageCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 flex items-center gap-3">
        {onShareRide && (
          <Button
            variant="outline"
            onClick={onShareRide}
            className="flex-1"
          >
            <Share2 size={18} className="mr-2" />
            Share
          </Button>
        )}
        {onCancelRide && rideStatus === 'pending' && (
          <Button
            variant="outline"
            onClick={onCancelRide}
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            Cancel Ride
          </Button>
        )}
        {onCancelRide && rideStatus !== 'pending' && rideStatus !== 'completed' && (
          <Button
            variant="outline"
            onClick={onCancelRide}
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            Report Issue
          </Button>
        )}
        {/* Confirm Completion button - shown when ride is in progress */}
        {onConfirmCompletion && rideStatus === 'awaiting_customer_confirmation' && (
          <Button
            variant="success"
            onClick={() => {
              if (window.confirm('Confirm you have arrived at your destination? This will release payment to the rider.')) {
                onConfirmCompletion();
              }
            }}
            disabled={isConfirming}
            className="flex-1"
            leftIcon={<CheckCircle size={18} />}
          >
            {isConfirming ? 'Confirming...' : 'Confirm Arrival'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RouteDisplay;