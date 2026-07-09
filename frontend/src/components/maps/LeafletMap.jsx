import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { 
  isValidLatLng, 
  isValidCoordObject, 
  validateRouteCoordinates, 
  validateMarkers,
  getValidCenter 
} from '../../utils/mapValidation';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom rider icon
const createRiderIcon = (isOnline = true) => {
  return L.divIcon({
    className: 'custom-rider-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${isOnline ? '#10B981' : '#6B7280'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Custom user location icon
const userLocationIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3B82F6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(59,130,246,0.5);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: white;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(59,130,246,0.2);
        animation: pulse 2s infinite;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom pickup/dropoff icons
const pickupIcon = L.divIcon({
  className: 'custom-pickup-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: #10B981;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(16,185,129,0.5);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const dropoffIcon = L.divIcon({
  className: 'custom-dropoff-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: #EF4444;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(239,68,68,0.5);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Map event handler for click-to-select location
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng);
      }
    },
  });
  return null;
}

// Component to update map center dynamically
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 0.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Route polyline component with validation
function RouteLine({ routeCoordinates }) {
  // Validate route coordinates
  const validCoordinates = validateRouteCoordinates(routeCoordinates);
  
  if (!validCoordinates || validCoordinates.length < 2) {
    return null;
  }
  
  return (
    <Polyline
      positions={validCoordinates}
      color="#3B82F6"
      weight={4}
      opacity={0.8}
      dashArray="10, 10"
    />
  );
}

// Fallback coordinates for major Kenyan cities
const fallbackLocations = {
  nairobi: [-1.2921, 36.8219],
  mombasa: [-4.0435, 39.6682],
  kisumu: [-0.0917, 34.7680],
  nakuru: [-0.3031, 36.0800],
  eldoret: [0.5143, 35.2698],
  thika: [-1.0332, 37.0693],
  default: [-1.2921, 36.8219],
};

/**
 * Main Leaflet Map Component
 * Supports: live rider tracking, location selection, route display
 */
const LeafletMap = ({
  center = [-1.2921, 36.8219], // Default: Nairobi, Kenya
  zoom = 13,
  markers = [],
  showUserLocation = false,
  userLocation = null,
  onLocationSelect = null,
  pickupLocation = null,
  dropoffLocation = null,
  routeCoordinates = null,
  showTraffic = false,
  onMapClick = null,
  height = '400px',
  width = '100%',
  className = '',
  showControls = true,
  onCenterChange = null,
  onZoomChange = null,
  isLoading = false,
  error = null,
  onRetry = null,
}) => {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Validate and sanitize center coordinates
  const validCenter = getValidCenter(center);
  
  // Validate user location
  const validUserLocation = userLocation && isValidCoordObject(userLocation) ? userLocation : null;
  
  // Validate pickup location
  const validPickupLocation = pickupLocation && isValidCoordObject(pickupLocation) ? pickupLocation : null;
  
  // Validate dropoff location
  const validDropoffLocation = dropoffLocation && isValidCoordObject(dropoffLocation) ? dropoffLocation : null;
  
  // Validate markers
  const validMarkers = validateMarkers(markers);
  
  // Validate route coordinates
  const validRouteCoordinates = routeCoordinates && validateRouteCoordinates(routeCoordinates).length >= 2;

  const handleMapLoad = () => {
    setMapReady(true);
    setMapError(null);
  };

  const handleMapError = (err) => {
    console.error('Map error:', err);
    setMapError('Failed to load map. Please check your connection.');
  };

  const handleLocationSelect = (latlng) => {
    if (onLocationSelect) {
      onLocationSelect({
        lat: latlng.lat,
        lng: latlng.lng,
        timestamp: Date.now(),
      });
    }
  };

  // Loading state
  if (isLoading && !mapReady) {
    return (
      <div 
        className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}
        style={{ height, width }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - only show for actual map errors, not for data errors
  if (mapError) {
    return (
      <div 
        className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}
        style={{ height, width }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Map Loading Error</h3>
            <p className="text-gray-600 text-sm mb-4">{mapError}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-lg overflow-hidden shadow-md ${className}`}
      style={{ height, width }}
    >
      <MapContainer
        center={validCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="leaflet-container"
        whenCreated={handleMapLoad}
        onError={handleMapError}
        zoomControl={showControls}
      >
        {/* OpenStreetMap tiles - Free */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map click handler for location selection */}
        {onLocationSelect && <MapClickHandler onLocationSelect={handleLocationSelect} />}

        {/* Dynamic center updater */}
        <MapCenterUpdater center={validCenter} zoom={zoom} />

        {/* User location marker */}
        {showUserLocation && validUserLocation && (
          <Marker position={[validUserLocation.lat, validUserLocation.lng]} icon={userLocationIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Your Location</p>
                <p className="text-gray-500">
                  {validUserLocation.address || `${validUserLocation.lat.toFixed(4)}, ${validUserLocation.lng.toFixed(4)}`}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pickup marker */}
        {validPickupLocation && (
          <Marker position={[validPickupLocation.lat, validPickupLocation.lng]} icon={pickupIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-green-600">Pickup</p>
                <p className="text-gray-500">
                  {validPickupLocation.address || `${validPickupLocation.lat.toFixed(4)}, ${validPickupLocation.lng.toFixed(4)}`}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {validDropoffLocation && (
          <Marker position={[validDropoffLocation.lat, validDropoffLocation.lng]} icon={dropoffIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-red-600">Dropoff</p>
                <p className="text-gray-500">
                  {validDropoffLocation.address || `${validDropoffLocation.lat.toFixed(4)}, ${validDropoffLocation.lng.toFixed(4)}`}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route line */}
        {validRouteCoordinates && <RouteLine routeCoordinates={routeCoordinates} />}

        {/* Rider/nearby markers - only render valid markers */}
        {validMarkers.map((marker, index) => {
          // Get valid position from marker
          const lat = marker.lat || marker.location?.lat;
          const lng = marker.lng || marker.location?.lng;
          
          // Double-check validity before rendering
          if (!isValidLatLng(lat, lng)) {
            console.warn('[LeafletMap] Skipping invalid marker:', marker);
            return null;
          }
          
          return (
            <Marker
              key={marker.id || marker._id || index}
              position={[lat, lng]}
              icon={createRiderIcon(marker.isOnline !== false)}
            >
              {marker.popupContent && (
                <Popup>
                  <div className="text-sm">
                    {marker.popupContent}
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Custom CSS for map styling */}
      <style>{`
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .custom-rider-marker {
          background: transparent;
          border: none;
        }
        .custom-user-marker {
          background: transparent;
          border: none;
        }
        .custom-pickup-marker {
          background: transparent;
          border: none;
        }
        .custom-dropoff-marker {
          background: transparent;
          border: none;
        }
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LeafletMap;

// Export icons and utilities for external use
export { 
  createRiderIcon, 
  userLocationIcon, 
  pickupIcon, 
  dropoffIcon,
  fallbackLocations 
};