import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bike, Eye, Trash2, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { rideAPI } from '../services/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/Toast';

const statusConfig = {
  pending_payment: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Payment' },
  waiting_rider: { color: 'bg-blue-100 text-blue-700', label: 'Waiting Rider' },
  accepted: { color: 'bg-blue-100 text-blue-700', label: 'Accepted' },
  rider_assigned: { color: 'bg-blue-100 text-blue-700', label: 'Rider Assigned' },
  in_progress: { color: 'bg-purple-100 text-purple-700', label: 'In Progress' },
  awaiting_customer_confirmation: { color: 'bg-orange-100 text-orange-700', label: 'Awaiting Confirmation' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  declined: { color: 'bg-red-100 text-red-700', label: 'Declined' },
  cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
  no_rider_available: { color: 'bg-gray-100 text-gray-700', label: 'No Rider Available' },
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const CustomerRidesPage = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideIdParam = searchParams.get('rideId') || searchParams.get('id');

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [rideToConfirm, setRideToConfirm] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [rideToDelete, setRideToDelete] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      const { data } = await rideAPI.getCustomerRides(params);
      setRides(data?.data || []);
      setTotalPages(data?.pagination?.pages || 1);
      setTotalRides(data?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch rides:', error);
      toastError('Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [page]);

  useEffect(() => {
    if (rideIdParam && rides.length > 0) {
      const matched = rides.find(r => r._id === rideIdParam);
      if (matched) {
        setSelectedRide(matched);
        setShowModal(true);
      } else {
        const fetchAndSelectRide = async () => {
          try {
            const { data } = await rideAPI.getById(rideIdParam);
            const rd = data.data || data;
            if (rd) {
              setSelectedRide(rd);
              setShowModal(true);
            }
          } catch (err) {
            console.error('[CustomerRidesPage] Failed to fetch specific rideIdParam:', err);
          }
        };
        fetchAndSelectRide();
      }
    }
  }, [rideIdParam, rides]);

  const handleArchiveClick = (ride) => {
    setRideToDelete(ride);
    setShowDeleteModal(true);
  };

  const handleArchiveConfirm = async () => {
    if (!rideToDelete) return;

    try {
      setArchiving(true);
      await rideAPI.archive(rideToDelete._id);
      toastSuccess('Ride archived successfully');
      fetchRides();
      setShowDeleteModal(false);
      setRideToDelete(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to archive ride');
      console.error('Failed to archive ride:', error);
    } finally {
      setArchiving(false);
    }
  };

  const canArchiveRide = (ride) => {
    return ['completed', 'cancelled', 'declined'].includes(ride.status);
  };

  const canConfirmArrival = (ride) => {
    return ride.status === 'awaiting_customer_confirmation';
  };

  const handleConfirmArrival = (ride) => {
    setRideToConfirm(ride);
    setShowArrivalModal(true);
  };

  const handleArrivalConfirm = async () => {
    if (!rideToConfirm) return;

    try {
      setConfirming(true);
      await rideAPI.confirmCompletion(rideToConfirm._id);
      toastSuccess('Arrival confirmed successfully. Payment has been released to the rider.');
      fetchRides();
      setShowArrivalModal(false);
      setRideToConfirm(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to confirm arrival');
      console.error('Failed to confirm arrival:', error);
    } finally {
      setConfirming(false);
    }
  };

  const handleViewRide = (ride) => {
    setSelectedRide(ride);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Bike className="w-6 h-6" />
            My Rides
            <span className="text-sm font-normal text-gray-500">({totalRides} total)</span>
          </h1>
        </div>

        {/* Rides List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : rides.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No ride activity found"
            message="You haven't requested any rides yet. Book a ride to see your history here."
            actionLabel="Request Ride"
            onAction={() => navigate('/transport')}
          />
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <motion.div
                key={ride._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-500">
                        Ride #{ride._id?.slice(-6).toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${statusConfig[ride.status]?.color}`}>
                        {statusConfig[ride.status]?.label}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm">
                      {new Date(ride.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    <p className="text-gray-500 text-sm mt-1">
                      {ride.pickupLocation?.address || 'Pickup'} → {ride.dropoffLocation?.address || 'Dropoff'}
                    </p>

                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formatCurrency(ride.fare?.totalFare || ride.estimatedPrice || 0)}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRide(ride)}
                      leftIcon={<Eye size={14} />}
                    >
                      View Details
                    </Button>

                    {canConfirmArrival(ride) && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirmArrival(ride)}
                        leftIcon={<CheckCircle size={14} />}
                      >
                        Confirm Arrival
                      </Button>
                    )}

                    {canArchiveRide(ride) && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleArchiveClick(ride)}
                        leftIcon={<Trash2 size={14} />}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ride Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Ride Details"
        size="lg"
      >
        {selectedRide && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Ride ID</p>
                <p className="font-medium">#{selectedRide._id?.slice(-6).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded text-xs ${statusConfig[selectedRide.status]?.color}`}>
                    {statusConfig[selectedRide.status]?.label}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{new Date(selectedRide.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Fare</p>
                <p className="font-medium">{formatCurrency(selectedRide.fare?.totalFare || selectedRide.estimatedPrice || 0)}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Pickup Location</h3>
              <p className="text-gray-600">{selectedRide.pickupLocation?.address || 'N/A'}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Dropoff Location</h3>
              <p className="text-gray-600">{selectedRide.dropoffLocation?.address || 'N/A'}</p>
            </div>

            {selectedRide.rider && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Rider</h3>
                <p className="text-gray-600">{selectedRide.rider.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{selectedRide.rider.phone || 'N/A'}</p>
              </div>
            )}

            {selectedRide.trackingHistory && selectedRide.trackingHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Ride Timeline</h3>
                <div className="space-y-3">
                  {selectedRide.trackingHistory.map((event, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{event.status}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRideToDelete(null);
        }}
        title="Archive Ride"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900">Are you sure?</p>
              <p className="text-sm text-gray-600">
                This will archive ride{' '}
                <span className="font-mono">#{rideToDelete?._id?.slice(-6).toUpperCase()}</span>.
                Archived rides are hidden from your activity history.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setRideToDelete(null);
              }}
              disabled={archiving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleArchiveConfirm}
              isLoading={archiving}
              leftIcon={<Trash2 size={14} />}
            >
              Archive Ride
            </Button>
          </div>
        </div>
      </Modal>

      {/* Arrival Confirmation Modal */}
      <Modal
        isOpen={showArrivalModal}
        onClose={() => {
          setShowArrivalModal(false);
          setRideToConfirm(null);
        }}
        title="Confirm Arrival"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm">Have you arrived safely at your destination?</p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowArrivalModal(false);
                setRideToConfirm(null);
              }}
              disabled={confirming}
            >
              Not Yet
            </Button>
            <Button
              variant="primary"
              onClick={handleArrivalConfirm}
              isLoading={confirming}
              leftIcon={<CheckCircle size={14} />}
            >
              Yes, I have arrived
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerRidesPage;
