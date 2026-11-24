import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bike, Eye, Trash2, AlertCircle, CheckCircle, Clock, X, ShieldCheck, AlertTriangle } from 'lucide-react';
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
  disputed: { color: 'bg-red-100 text-red-700', label: 'Disputed' },
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
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [rideToDispute, setRideToDispute] = useState(null);
  const [disputeReason, setDisputeReason] = useState('Rider did not arrive');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
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

  const handleOpenDispute = (ride) => {
    setRideToDispute(ride);
    setDisputeReason('Rider did not arrive');
    setDisputeDetails('');
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = async () => {
    if (!rideToDispute || !disputeReason) return;
    try {
      setSubmittingDispute(true);
      await rideAPI.disputeRide(rideToDispute._id, {
        reason: disputeReason,
        details: disputeDetails,
      });
      toastSuccess('Problem reported. Escrow funds are held and administrator has been notified.');
      fetchRides();
      setShowDisputeModal(false);
      setRideToDispute(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to report problem');
      console.error('Failed to report dispute:', error);
    } finally {
      setSubmittingDispute(false);
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
                      <span className="font-medium text-gray-700">Pickup:</span> {ride.pickupLocation?.address || ride.pickupLocation?.name || 'Pickup Area'} → <span className="font-medium text-gray-700">Dropoff:</span> {ride.dropoffLocation?.address || ride.dropoffLocation?.name || 'Destination'}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <p className="text-sm font-black text-gray-900">
                        {formatCurrency(ride.fare?.totalFare || ride.estimatedPrice || 0)}
                      </p>

                      {ride.status === 'awaiting_customer_confirmation' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <ShieldCheck size={13} className="text-amber-600" />
                          Payment: Held in Escrow
                        </span>
                      )}

                      {ride.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          <CheckCircle size={13} className="text-green-600" />
                          Payment: Released
                        </span>
                      )}

                      {ride.status === 'disputed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle size={13} className="text-red-600" />
                          Disputed: Payment Frozen
                        </span>
                      )}
                    </div>

                    {/* Rider details if assigned */}
                    {ride.rider && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        {ride.rider.avatar || ride.rider.profilePhoto ? (
                          <img
                            src={ride.rider.avatar || ride.rider.profilePhoto}
                            alt={ride.rider.name || 'Rider'}
                            className="w-6 h-6 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {(ride.rider.name || 'R')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-gray-700">
                          Rider: {ride.rider.name}
                        </span>
                        {ride.rider.phone && (
                          <span className="text-xs text-gray-500">
                            • {ride.rider.phone}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Arrival notification banner for passenger */}
                    {ride.status === 'awaiting_customer_confirmation' && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-emerald-900">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Rider Has Arrived! Please confirm your arrival.</span>
                        </div>
                        <p className="text-emerald-800 text-[11px]">
                          Your payment is securely held in escrow. Tapping Confirm Arrival releases funds to the rider.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRide(ride)}
                      leftIcon={<Eye size={14} />}
                    >
                      View Details
                    </Button>

                    {canConfirmArrival(ride) && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirmArrival(ride)}
                          leftIcon={<CheckCircle size={14} />}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Confirm Arrival
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDispute(ride)}
                          leftIcon={<AlertTriangle size={14} className="text-red-500" />}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Report a Problem
                        </Button>
                      </>
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
          <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-neutral-900">
                Have you arrived safely at your destination and received the ride service?
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Confirming arrival will release the held escrow payment to your rider.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowArrivalModal(false);
                setRideToConfirm(null);
              }}
              disabled={confirming}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleArrivalConfirm}
              isLoading={confirming}
              leftIcon={<CheckCircle size={14} />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Yes, Confirm Arrival
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report a Problem / Dispute Modal */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => {
          setShowDisputeModal(false);
          setRideToDispute(null);
        }}
        title="Report a Problem"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 text-red-800 p-3.5 rounded-xl border border-red-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Escrow Payment Protection</p>
              <p className="mt-0.5">
                Reporting a problem freezes the escrow payment to the rider. Our support team will investigate and ensure a fair resolution.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Issue
            </label>
            <div className="space-y-2">
              {[
                'Rider did not arrive',
                'Ride was not completed',
                'Safety or service issue',
                'Other issue',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    disputeReason === reason
                      ? 'border-red-500 bg-red-50/50 text-neutral-900 font-semibold'
                      : 'border-gray-200 hover:bg-gray-50 text-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="disputeReason"
                    value={reason}
                    checked={disputeReason === reason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={disputeDetails}
              onChange={(e) => setDisputeDetails(e.target.value)}
              placeholder="Provide more context so our support team can resolve this quickly..."
              className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisputeModal(false);
                setRideToDispute(null);
              }}
              disabled={submittingDispute}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmitDispute}
              isLoading={submittingDispute}
              leftIcon={<AlertTriangle size={14} />}
            >
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerRidesPage;
