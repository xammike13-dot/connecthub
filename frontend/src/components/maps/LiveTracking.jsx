import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Bike, 
  Navigation, 
  MapPin, 
  Phone, 
  MessageCircle,
  Clock,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Share2,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import LeafletMap, { fallbackLocations } from './LeafletMap';

/**
 * LiveTracking Component
 * Real-time tracking component for riders to see their active deliveries
 * Shows current location, route, and customer location
 */
const LiveTracking = ({
  riderLocation = null,
  customerLocation = null,
  pickupLocation = null,
  dropoffLocation = null,
  routeCoordinates = null,
  customer = null,
  orderDetails = null,
  status = 'idle', // idle, pickup, enRoute, delivered
  onNavigate = null,
  onComplete = null,
  onContactCustomer = null,
  onShare = null,
  isLoading = false,
  error = null,
  height = '400px',
}) => {
  const [mapCenter, setMapCenter] = useState(
    riderLocation ? [riderLocation.lat, riderLocation.lng] : fallbackLocations.nairobi
  );
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Update map center when rider location changes
  useEffect(() => {
    if (riderLocation) {
      setMapCenter([riderLocation.lat, riderLocation.lng]);
      setLastUpdate(Date.now());
    }
  }, [riderLocation]);

  // Create markers for the map
  const markers = [];
  
  // Add customer location marker
  if (customerLocation) {
    markers.push({
      id: 'customer',
      lat: customerLocation.lat,
      lng: customerLocation.lng,
      isOnline: true,
      popupContent: (
        <div className="p-2">
          <div className="flex items-center gap-2">
            <User className="text-purple-500" size={16} />
            <span className="font-semibold">Customer</span>
          </div>
        </div>
      ),
    });
  }

  // Status configuration
  const statusConfig = {
    idle: {
      title: 'No Active Orders',
      description: 'You are currently offline or have no active orders',
      color: 'bg-gray-500',
      icon: <Bike className="text-gray-500" size={20} />,
    },
    pickup: {
      title: 'Navigate to Pickup',
      description: 'Head to the pickup location',
      color: 'bg-green-500',
      icon: <MapPin className="text-green-500" size={20} />,
    },
    enRoute: {
      title: 'En Route to Dropoff',
      description: 'Deliver to the customer',
      color: 'bg-blue-500',
      icon: <Navigation className="text-blue-500" size={20} />,
    },
    delivered: {
      title: 'Delivery Complete',
      description: 'Order has been delivered',
      color: 'bg-green-500',
      icon: <CheckCircle className="text-green-500" size={20} />,
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.idle;

  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Status Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {currentStatus.icon}
            </div>
            <div>
              <h2 className="font-bold">{currentStatus.title}</h2>
              <p className="text-blue-100 text-sm">{currentStatus.description}</p>
            </div>
          </div>
          {riderLocation && (
            <div className="text-right">
              <p className="text-xs text-blue-200">Last update</p>
              <p className="text-sm font-medium">{getTimeSinceUpdate()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details (collapsible) */}
      {orderDetails && (
        <div className="border-b">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bike className="text-blue-600" size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Order #{orderDetails.id}</p>
                <p className="text-sm text-gray-500">
                  {orderDetails.type === 'ride' ? 'Bodaboda Ride' : 'Delivery'}
                </p>
              </div>
            </div>
            {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-4 pb-4"
            >
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {/* Customer Info */}
                {customer && (
                  <div className="flex items-center gap-3">
                    <img
                      src={customer.avatar || 'https://via.placeholder.com/40'}
                      alt={customer.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                    </div>
                    {onContactCustomer && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onContactCustomer('phone')}
                          className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                        >
                          <Phone size={18} />
                        </button>
                        <button
                          onClick={() => onContactCustomer('message')}
                          className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {pickupLocation?.name || pickupLocation?.address || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dropoff</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {dropoffLocation?.name || dropoffLocation?.address || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Earnings */}
                {orderDetails.earnings && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2 text-gray-500">
                      <DollarSign size={16} />
                      <span className="text-sm">Earnings</span>
                    </div>
                    <p className="font-bold text-green-600">KSh {orderDetails.earnings}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{ height }}>
        <LeafletMap
          center={mapCenter}
          zoom={15}
          markers={markers}
          showUserLocation={!!riderLocation}
          userLocation={riderLocation}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          routeCoordinates={routeCoordinates}
          height="100%"
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Action Buttons */}
      {status !== 'idle' && status !== 'delivered' && (
        <div className="p-4 bg-gray-50 flex items-center gap-3">
          {onNavigate && (
            <Button
              variant="primary"
              onClick={() => onNavigate(status === 'pickup' ? pickupLocation : dropoffLocation)}
              className="flex-1"
            >
              <Navigation size={18} className="mr-2" />
              Navigate
            </Button>
          )}
          {onComplete && status === 'enRoute' && (
            <Button
              variant="primary"
              onClick={onComplete}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={18} className="mr-2" />
              Mark Delivered
            </Button>
          )}
          {onShare && (
            <Button
              variant="outline"
              onClick={onShare}
            >
              <Share2 size={18} />
            </Button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Dropoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Customer</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;