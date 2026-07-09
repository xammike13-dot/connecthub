import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Crosshair, 
  X, 
  ChevronRight,
  Clock,
  History,
  AlertCircle,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LeafletMap, { fallbackLocations } from './LeafletMap';

/**
 * LocationSelector Component
 * Allows users to select pickup and dropoff locations on a map
 * Features:
 * - Click on map to select location
 * - Search for locations (using Nominatim OSM geocoding - free)
 * - Use current location
 * - Recent locations history
 * - Reverse geocoding for addresses
 */
const LocationSelector = ({
  onSelectPickup,
  onSelectDropoff,
  initialPickup = null,
  initialDropoff = null,
  userLocation = null,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [step, setStep] = useState('pickup'); // 'pickup', 'dropoff', 'confirm'
  const [pickupLocation, setPickupLocation] = useState(initialPickup);
  const [dropoffLocation, setDropoffLocation] = useState(initialDropoff);
  const [mapCenter, setMapCenter] = useState(
    userLocation?.lat ? [userLocation.lat, userLocation.lng] : fallbackLocations.nairobi
  );
  const [mapZoom, setMapZoom] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Load recent locations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentLocations');
      if (saved) {
        setRecentLocations(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent locations:', e);
    }
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for locations using Nominatim (free OSM geocoding)
  const searchLocations = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ke&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data.map(result => ({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
        name: result.name || result.display_name.split(',')[0],
      })));
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocations(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
            name: 'My Location',
          };
          
          if (step === 'pickup') {
            setPickupLocation(location);
            setMapCenter([location.lat, location.lng]);
          } else {
            setDropoffLocation(location);
            setMapCenter([location.lat, location.lng]);
          }
        },
        (err) => {
          setError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  // Handle map click to select location
  const handleMapLocationSelect = async (latlng) => {
    try {
      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
      );
      const data = await response.json();
      
      const location = {
        lat: latlng.lat,
        lng: latlng.lng,
        address: data.display_name || `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
        name: data.address?.road || data.address?.suburb || 'Selected Location',
      };

      if (step === 'pickup') {
        setPickupLocation(location);
      } else {
        setDropoffLocation(location);
      }
    } catch (err) {
      // Fallback without reverse geocoding
      const location = {
        lat: latlng.lat,
        lng: latlng.lng,
        address: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
        name: 'Selected Location',
      };

      if (step === 'pickup') {
        setPickupLocation(location);
      } else {
        setDropoffLocation(location);
      }
    }
  };

  // Select from search results
  const selectFromSearch = (result) => {
    if (step === 'pickup') {
      setPickupLocation(result);
    } else {
      setDropoffLocation(result);
    }
    setMapCenter([result.lat, result.lng]);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Select from recent locations
  const selectFromRecent = (location) => {
    if (step === 'pickup') {
      setPickupLocation(location);
    } else {
      setDropoffLocation(location);
    }
    setMapCenter([location.lat, location.lng]);
  };

  // Save location to recent
  const saveToRecent = (location) => {
    const updated = [
      { ...location, timestamp: Date.now() },
      ...recentLocations.filter(l => 
        Math.abs(l.lat - location.lat) > 0.001 || Math.abs(l.lng - location.lng) > 0.001
      ).slice(0, 4)
    ];
    setRecentLocations(updated);
    try {
      localStorage.setItem('recentLocations', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent location:', e);
    }
  };

  // Proceed to next step
  const handleContinue = () => {
    if (step === 'pickup' && pickupLocation) {
      saveToRecent(pickupLocation);
      setStep('dropoff');
      setMapCenter([pickupLocation.lat, pickupLocation.lng]);
      if (onSelectPickup) onSelectPickup(pickupLocation);
    } else if (step === 'dropoff' && dropoffLocation) {
      saveToRecent(dropoffLocation);
      setStep('confirm');
      if (onSelectDropoff) onSelectDropoff(dropoffLocation);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    if (step === 'dropoff') {
      setStep('pickup');
    } else if (step === 'confirm') {
      setStep('dropoff');
    }
  };

  // Clear current selection
  const clearSelection = () => {
    if (step === 'pickup') {
      setPickupLocation(null);
    } else {
      setDropoffLocation(null);
    }
  };

  // Confirm and submit
  const handleConfirm = () => {
    if (onConfirm && pickupLocation && dropoffLocation) {
      onConfirm({ pickup: pickupLocation, dropoff: dropoffLocation });
    }
  };

  const currentLocation = step === 'pickup' ? pickupLocation : dropoffLocation;
  const isLocationSelected = !!currentLocation;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {step === 'pickup' && 'Select Pickup Location'}
              {step === 'dropoff' && 'Select Dropoff Location'}
              {step === 'confirm' && 'Confirm Your Ride'}
            </h2>
            <p className="text-blue-100 text-sm">
              {step === 'pickup' && 'Tap on the map or search for a location'}
              {step === 'dropoff' && 'Where are you going?'}
              {step === 'confirm' && 'Review your ride details'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4">
          <div className={`flex items-center gap-2 ${step !== 'pickup' ? 'text-green-300' : 'text-white'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              pickupLocation ? 'bg-green-500' : 'bg-white/20'
            }`}>
              {pickupLocation ? <Check size={16} /> : <MapPin size={16} />}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Pickup</span>
          </div>
          <div className="w-8 h-0.5 bg-white/30" />
          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-green-300' : step === 'dropoff' ? 'text-white' : 'text-white/50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              dropoffLocation ? 'bg-green-500' : step === 'dropoff' ? 'bg-white/20' : 'bg-white/10'
            }`}>
              {dropoffLocation ? <Check size={16} /> : <Navigation size={16} />}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Dropoff</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b" ref={searchRef}>
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <button
              onClick={getCurrentLocation}
              className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              title="Use current location"
            >
              <Crosshair size={20} />
            </button>
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showSearch && (searchResults.length > 0 || isSearching) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border max-h-64 overflow-y-auto z-50"
              >
                {isSearching && (
                  <div className="p-4 text-center text-gray-500">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                )}
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => selectFromSearch(result)}
                    className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 border-b last:border-0"
                  >
                    <MapPin className="text-gray-400 flex-shrink-0" size={18} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.name}</p>
                      <p className="text-sm text-gray-500 truncate">{result.address}</p>
                    </div>
                    <ChevronRight className="text-gray-400" size={18} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent Locations */}
      {!isLocationSelected && recentLocations.length > 0 && step !== 'confirm' && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Recent Locations</span>
          </div>
          <div className="space-y-2">
            {recentLocations.slice(0, 3).map((location, index) => (
              <button
                key={index}
                onClick={() => selectFromRecent(location)}
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
              >
                <Clock size={16} className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{location.name || location.address}</p>
                </div>
                <ChevronRight className="text-gray-400" size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Location Display */}
      {isLocationSelected && (
        <div className="p-4 border-b bg-green-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                {step === 'pickup' ? (
                  <MapPin className="text-green-600" size={20} />
                ) : (
                  <Navigation className="text-green-600" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">
                  {step === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}
                </p>
                <p className="font-medium text-gray-900">{currentLocation.name}</p>
                <p className="text-sm text-gray-500 truncate">{currentLocation.address}</p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-64 sm:h-80 relative">
        <LeafletMap
          center={mapCenter}
          zoom={mapZoom}
          onLocationSelect={handleMapLocationSelect}
          pickupLocation={step === 'confirm' ? pickupLocation : step === 'pickup' ? currentLocation : null}
          dropoffLocation={step === 'confirm' ? dropoffLocation : step === 'dropoff' ? currentLocation : null}
          showUserLocation={!!userLocation}
          userLocation={userLocation}
          height="100%"
          isLoading={isLoading}
          error={error}
          onRetry={() => setError(null)}
        />
        
        {/* Map hint */}
        {!isLocationSelected && step !== 'confirm' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
            Tap on the map to select location
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={18} />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-3">
          {step !== 'pickup' && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-shrink-0"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 'confirm' ? (
            <>
              <Button
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                isLoading={isLoading}
                isDisabled={!pickupLocation || !dropoffLocation}
              >
                Confirm Ride
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleContinue}
              isDisabled={!isLocationSelected}
            >
              {step === 'pickup' ? 'Continue to Dropoff' : 'Continue'}
              <ChevronRight size={18} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;