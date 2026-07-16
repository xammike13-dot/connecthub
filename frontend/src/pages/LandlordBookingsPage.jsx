import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, Phone, User, CheckCircle, XCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { landlordAPI, rentalAPI } from '../services/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/paymentCalculator';

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Accepted',
  out_for_handover: 'Ready for Move-In',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  out_for_handover: 'bg-purple-100 text-purple-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const escrowLabels = {
  held: 'Held',
  released: 'Released',
};

const LandlordBookingsPage = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId') || searchParams.get('id');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (bookingIdParam && bookings.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`booking-${bookingIdParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [bookingIdParam, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await landlordAPI.getBookings();
      setBookings(response.data.data || []);
      console.log('[LANDLORD BOOKINGS]', response.data.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toastError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAccept = async (booking) => {
    try {
      setProcessing(true);
      await rentalAPI.updateBookingStatus(booking.rentalId, booking.bookingId, {
        status: 'confirmed',
        paymentStatus: 'paid'
      });
      toastSuccess('Booking accepted successfully');
      fetchBookings();
    } catch (error) {
      console.error('[ACCEPT BOOKING ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to accept booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineClick = (booking) => {
    setSelectedBooking(booking);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const handleDeclineConfirm = async () => {
    if (!declineReason.trim()) {
      toastError('Please provide a reason for declining');
      return;
    }

    try {
      setProcessing(true);
      await rentalAPI.updateBookingStatus(selectedBooking.rentalId, selectedBooking.bookingId, {
        status: 'cancelled',
        declineReason
      });
      toastSuccess('Booking declined successfully');
      setShowDeclineModal(false);
      setSelectedBooking(null);
      setDeclineReason('');
      fetchBookings();
    } catch (error) {
      console.error('[DECLINE BOOKING ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to decline booking');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-8">
          <Home className="w-6 h-6" />
          Bookings
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No bookings found"
            message="You haven't received any rental bookings yet."
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isHighlighted = booking.bookingId === bookingIdParam || booking._id === bookingIdParam;

              return (
                <motion.div
                  key={booking.bookingId}
                  id={`booking-${booking.bookingId || booking._id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl shadow-sm p-6 transition-all duration-200 ${
                    isHighlighted
                      ? 'bg-blue-50/40 border-2 border-blue-500 ring-2 ring-blue-100 shadow-md'
                      : 'bg-white'
                  }`}
                >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{booking.rentalName}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColors[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Customer</p>
                          <p className="text-sm font-medium">{booking.customer?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium">{booking.customer?.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Monthly Rent</p>
                          <p className="text-sm font-medium">{formatCurrency(booking.monthlyPrice)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Booking Date</p>
                          <p className="text-sm font-medium">
                            {new Date(booking.bookingDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Entry Date</p>
                          <p className="text-sm font-medium">
                            {booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString() : 'Not selected yet'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Payment Status</p>
                          <p className="text-sm font-medium capitalize">{booking.paymentStatus}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Escrow Status</p>
                          <p className="text-sm font-medium capitalize">{escrowLabels[booking.escrowStatus] || booking.escrowStatus}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        leftIcon={<CheckCircle size={14} />}
                        onClick={() => handleAccept(booking)}
                        isLoading={processing}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<XCircle size={14} />}
                        onClick={() => handleDeclineClick(booking)}
                        disabled={processing}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )})}
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false);
          setSelectedBooking(null);
          setDeclineReason('');
        }}
        title="Decline Booking"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for declining booking:
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Property no longer available, Double booking, Maintenance in progress..."
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineModal(false);
                setSelectedBooking(null);
                setDeclineReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeclineConfirm}
              isLoading={processing}
              leftIcon={<XCircle size={14} />}
            >
              Decline Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LandlordBookingsPage;
