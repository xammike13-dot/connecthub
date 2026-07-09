import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bike, 
  Users, 
  MapPin, 
  Navigation, 
  Star, 
  Phone, 
  MessageCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import LeafletMap, { createRiderIcon, fallbackLocations } from './LeafletMap';
import RiderCard from '../cards/RiderCard';
import { isValidLatLng, getValidCenter } from '../../utils/mapValidation';

/**
 * NearbyRidersMap Component
 * Displays nearby riders on a map with filtering and selection capabilities
 * Used for bodaboda ride booking
 */
const NearbyRidersMap = ({
  riders = [],
  userLocation = null,
  onSelectRider,
  onRefresh,
  isLoading = false,
  error = null,
  onRetry,
  center,
  zoom = 14,
  showRoute = false,
  pickupLocation = null,
  dropoffLocation = null,
  routeCoordinates = null,
}) => {
  const [selectedRider, setSelectedRider] = useState(null);
  const [mapCenter, setMapCenter] = useState(
    center || (userLocation ? [userLocation.lat, userLocation.lng] : fallbackLocations.nairobi)
  );
  const [mapZoom, setMapZoom] = useState(zoom);
  const [filter, setFilter] = useState('all'); // 'all', 'online', 'highRated'
  const [showRiderList, setShowRiderList] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update map center when user location changes
  useEffect(() => {
    if (center) {
      const validCenter = getValidCenter(center);
      setMapCenter(validCenter);
    } else if (userLocation) {
      if (isValidLatLng(userLocation.lat, userLocation.lng)) {
        setMapCenter([userLocation.lat, userLocation.lng]);
      }
    }
  }, [center, userLocation]);

  // Filter riders based on current filter
  const filteredRiders = riders.filter(rider => {
    if (filter === 'online') return rider.isOnline !== false;
    if (filter === 'highRated') return (rider.rating || 0) >= 4.5;
    return true;
  });

  // Handle rider selection
  const handleRiderSelect = (rider) => {
    setSelectedRider(rider);
    if (onSelectRider) {
      onSelectRider(rider);
    }
    // Center map on selected rider
    if (rider.lat && rider.lng) {
      setMapCenter([rider.lat, rider.lng]);
      setMapZoom(16);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Create markers for the map with proper validation
  const markers = filteredRiders
    .filter(r => isValidLatLng(r.lat, r.lng))
    .map(rider => ({
      id: rider._id || rider.id,
      lat: rider.lat,
      lng: rider.lng,
      isOnline: rider.isOnline !== false,
      popupContent: (
        <div className="p-2 min-w-[150px]">
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={rider.avatar || 'https://via.placeholder.com/40'} 
              alt={rider.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold text-gray-900">{rider.name}</p>
              <div className="flex items-center gap-1 text-sm">
                <Star className="text-yellow-400 fill-current" size={12} />
                <span>{(rider.rating || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p>{rider.riderProfile?.vehicleType || 'Motorcycle'}</p>
            {rider.distance && (
              <p className="text-xs mt-1">{rider.distance.toFixed(1)} km away</p>
            )}
          </div>
        </div>
      ),
    }));

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bike size={20} />
              Nearby Riders
            </h2>
            <p className="text-blue-100 text-sm">
              {filteredRiders.length} riders available
              {userLocation && ` near you`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
              title="Refresh riders"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowRiderList(!showRiderList)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors lg:hidden"
            >
              {showRiderList ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-1 bg-white/20 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('online')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'online' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/20'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setFilter('highRated')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'highRated' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/20'
              }`}
            >
              4.5+ ⭐
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-b">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={18} />
            <p className="text-sm">{error}</p>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col lg:flex-row">
        {/* Map */}
        <div className="flex-1 h-64 lg:h-96 relative">
          <LeafletMap
            center={mapCenter}
            zoom={mapZoom}
            markers={markers}
            showUserLocation={!!userLocation}
            userLocation={userLocation}
            pickupLocation={pickupLocation}
            dropoffLocation={dropoffLocation}
            routeCoordinates={routeCoordinates}
            height="100%"
            isLoading={isLoading}
            onRetry={onRetry}
          />

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg shadow-md p-3 text-xs">
            <p className="font-semibold mb-2">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
                <span>Online Rider</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white" />
                <span>Offline Rider</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                <span>Your Location</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rider List */}
        {showRiderList && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200">
            <div className="p-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700 text-sm">
                Available Riders ({filteredRiders.length})
              </h3>
            </div>
            <div className="max-h-64 lg:max-h-96 overflow-y-auto p-3 space-y-3">
              {isLoading && !filteredRiders.length ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading riders...</p>
                </div>
              ) : filteredRiders.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No riders found</p>
                  <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                filteredRiders.map((rider) => (
                  <motion.div
                    key={rider._id || rider.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`cursor-pointer ${
                      selectedRider?._id === rider._id ? 'ring-2 ring-blue-500 rounded-lg' : ''
                    }`}
                    onClick={() => handleRiderSelect(rider)}
                  >
                    <RiderCard
                      rider={rider}
                      onSelect={() => handleRiderSelect(rider)}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Rider Action Bar */}
      {selectedRider && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="border-t p-4 bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={selectedRider.avatar || 'https://via.placeholder.com/50'}
                alt={selectedRider.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-semibold text-gray-900">{selectedRider.name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="text-yellow-400 fill-current" size={14} />
                    {(selectedRider.rating || 0).toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{selectedRider.riderProfile?.vehicleType || 'Motorcycle'}</span>
                  {selectedRider.distance && (
                    <>
                      <span>•</span>
                      <span>{selectedRider.distance.toFixed(1)} km away</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRider(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSelectRider && onSelectRider(selectedRider)}
                isDisabled={!selectedRider.isOnline}
              >
                {selectedRider.isOnline ? 'Book Ride' : 'Offline'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NearbyRidersMap;