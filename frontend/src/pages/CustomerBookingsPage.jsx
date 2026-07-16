import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Eye, CheckCircle, Trash2, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { customerAPI, rentalAPI } from '../services/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/paymentCalculator';
import { useSocket } from '../context/SocketContext';

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Accepted',
  out_for_handover: 'Ready for Move-In',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const escrowLabels = {
  held: 'Held',
  released: 'Released',
};

const CustomerBookingsPage = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId') || searchParams.get('id');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showMoveInConfirmModal, setShowMoveInConfirmModal] = useState(false);
  const [moveInBooking, setMoveInBooking] = useState(null);
  const [showMoveInDateModal, setShowMoveInDateModal] = useState(false);
  const [selectedMoveInDate, setSelectedMoveInDate] = useState('');
  const [settingDate, setSettingDate] = useState(false);
  const [payingRent, setPayingRent] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data } = await rentalAPI.getMyBookings();
      // Show all bookings (not just paid ones) so customers can see pending bookings
      const allBookings = (data?.data || []).filter(
        item => item.booking.status !== 'cancelled'
      );
      setBookings(allBookings);
      console.log('[CUSTOMER BOOKINGS] All bookings:', allBookings.length);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toastError('Failed to fetch rental bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

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

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchBookings();
    socket.on('rental_out_for_handover', refresh);
    socket.on('booking_accepted', refresh);
    socket.on('booking_declined', refresh);
    return () => {
      socket.off('rental_out_for_handover', refresh);
      socket.off('booking_accepted', refresh);
      socket.off('booking_declined', refresh);
    };
  }, [socket]);

  const canConfirmMoveIn = (booking) =>
    booking.paymentStatus === 'paid' &&
    (booking.status === 'confirmed' || booking.status === 'out_for_handover') &&
    !booking.moveInConfirmed;

  const canSelectMoveInDate = (booking) =>
    booking.paymentStatus === 'paid' &&
    booking.status === 'confirmed' &&
    !booking.moveInDate;

  const isRentDue = (booking) => {
    if (!booking.nextRentDueDate || booking.status !== 'active') return false;
    const today = new Date();
    const dueDate = new Date(booking.nextRentDueDate);
    return today >= dueDate;
  };

  const getRentDaysOverdue = (booking) => {
    if (!booking.nextRentDueDate || booking.status !== 'active') return 0;
    const today = new Date();
    const dueDate = new Date(booking.nextRentDueDate);
    const diffTime = today - dueDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatMoveInDate = (date) => {
    if (!date) return 'Not selected yet';
    return new Date(date).toLocaleDateString();
  };

  const canArchiveBooking = (booking) =>
    booking.status === 'completed' || booking.status === 'cancelled';

  const handleArchiveClick = (item) => {
    setBookingToDelete(item);
    setShowDeleteModal(true);
  };

  const handleArchiveConfirm = async () => {
    if (!bookingToDelete) return;

    try {
      setArchiving(true);
      await rentalAPI.archiveBooking(bookingToDelete.rental._id, bookingToDelete.booking._id);
      toastSuccess('Booking archived successfully');
      fetchBookings();
      setShowDeleteModal(false);
      setBookingToDelete(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to archive booking');
      console.error('Failed to archive booking:', error);
    } finally {
      setArchiving(false);
    }
  };

  const handleConfirmMoveInClick = (rentalId, bookingId) => {
    setMoveInBooking({ rentalId, bookingId });
    setShowMoveInConfirmModal(true);
  };

  const handleConfirmMoveIn = async () => {
    if (!moveInBooking) return;

    try {
      setConfirming(true);
      await rentalAPI.confirmMoveIn(moveInBooking.rentalId, moveInBooking.bookingId);
      toastSuccess('Move-in confirmed successfully');
      fetchBookings();
      setShowMoveInConfirmModal(false);
      setMoveInBooking(null);
    } catch (error) {
      console.error('[CONFIRM MOVE-IN ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to confirm move-in');
    } finally {
      setConfirming(false);
    }
  };

  const handleSelectMoveInDateClick = (rentalId, bookingId) => {
    setMoveInBooking({ rentalId, bookingId });
    setSelectedMoveInDate('');
    setShowMoveInDateModal(true);
  };

  const handleSetMoveInDate = async () => {
    if (!moveInBooking || !selectedMoveInDate) {
      toastError('Please select a move-in date');
      return;
    }

    try {
      setSettingDate(true);
      await rentalAPI.setMoveInDate(moveInBooking.rentalId, moveInBooking.bookingId, {
        moveInDate: selectedMoveInDate
      });
      toastSuccess('Move-in date set successfully');
      fetchBookings();
      setShowMoveInDateModal(false);
      setMoveInBooking(null);
      setSelectedMoveInDate('');
    } catch (error) {
      console.error('[SET MOVE-IN DATE ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to set move-in date');
    } finally {
      setSettingDate(false);
    }
  };

  const handlePayRent = async (rentalId, bookingId) => {
    try {
      setPayingRent(true);
      const response = await rentalAPI.payMonthlyRent(rentalId, bookingId);
      toastSuccess('Rent payment initiated. Please complete M-Pesa payment.');
      console.log('[PAY RENT] Response:', response.data);
    } catch (error) {
      console.error('[PAY RENT ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to initiate rent payment');
    } finally {
      setPayingRent(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-8">
          <Home className="w-6 h-6" />
          My Rental Bookings
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No rental bookings"
            message="You haven't booked any rentals yet."
            actionLabel="Browse Rentals"
            onAction={() => navigate('/rentals')}
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((item) => {
              const { rental, booking } = item;
              console.log('[CUSTOMER BOOKINGS]', {
                bookingId: booking._id,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                escrowStatus: booking.escrowStatus,
              });

              const isHighlighted = booking._id === bookingIdParam;

              return (
                <motion.div
                  key={booking._id}
                  id={`booking-${booking._id}`}
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
                        <h3 className="font-semibold text-gray-900">{rental?.rentalName}</h3>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'active' ? 'bg-green-100 text-green-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {statusLabels[booking.status] || booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{rental?.rentalType?.replace('-', ' ')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(booking.startDate).toLocaleDateString()} –{' '}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {formatCurrency(booking.totalPrice)}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Payment:</span>
                          <span className="ml-2 font-medium capitalize">{booking.paymentStatus}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Escrow:</span>
                          <span className="ml-2 font-medium capitalize">{escrowLabels[booking.escrowStatus] || booking.escrowStatus}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Entry Date:</span>
                          <span className="ml-2 font-medium">{formatMoveInDate(booking.moveInDate)}</span>
                        </div>
                        {booking.status === 'active' && booking.nextRentDueDate && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Next Rent Due:</span>
                            <span className={`ml-2 font-medium ${isRentDue(booking) ? 'text-red-600' : ''}`}>
                              {new Date(booking.nextRentDueDate).toLocaleDateString()}
                              {isRentDue(booking) && ` (${getRentDaysOverdue(booking)} days overdue)`}
                            </span>
                          </div>
                        )}
                        {rental?.landlord?.phone && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Landlord:</span>
                            <span className="ml-2 font-medium">{rental.landlord.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye size={14} />}
                        onClick={() => {
                          setSelectedBooking(item);
                          setShowModal(true);
                        }}
                      >
                        View Details
                      </Button>
                      {canSelectMoveInDate(booking) && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Calendar size={14} />}
                          onClick={() => handleSelectMoveInDateClick(rental._id, booking._id)}
                        >
                          Select Entry Date
                        </Button>
                      )}
                      {isRentDue(booking) && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<DollarSign size={14} />}
                          onClick={() => handlePayRent(rental._id, booking._id)}
                          isLoading={payingRent}
                        >
                          Pay Rent
                        </Button>
                      )}
                      {canConfirmMoveIn(booking) && (
                        <Button
                          variant="success"
                          size="sm"
                          leftIcon={<CheckCircle size={14} />}
                          onClick={() => handleConfirmMoveInClick(rental._id, booking._id)}
                        >
                          Confirm I Have Entered The Room
                        </Button>
                      )}
                      {canArchiveBooking(booking) && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 size={14} />}
                          onClick={() => handleArchiveClick(item)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Booking Details" size="lg">
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Property</p>
                <p className="font-medium">{selectedBooking.rental?.rentalName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{statusLabels[selectedBooking.booking.status] || selectedBooking.booking.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment</p>
                <p className="font-medium capitalize">{selectedBooking.booking.paymentStatus}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium">{formatCurrency(selectedBooking.booking.totalPrice)}</p>
              </div>
            </div>
            {selectedBooking.booking.status === 'out_for_handover' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  The landlord has marked the room as occupied. Please confirm once you have moved in.
                </p>
                <Button
                  variant="success"
                  className="mt-3"
                  onClick={() => handleConfirmMoveInClick(selectedBooking.rental._id, selectedBooking.booking._id)}
                  leftIcon={<CheckCircle size={16} />}
                >
                  Confirm Moved Into Room
                </Button>
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
          setBookingToDelete(null);
        }}
        title="Archive Booking"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900">Are you sure?</p>
              <p className="text-sm text-gray-600">
                This will archive your booking for{' '}
                <span className="font-semibold">{bookingToDelete?.rental?.rentalName}</span>.
                Archived bookings are hidden from your activity history.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setBookingToDelete(null);
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
              Archive Booking
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move-In Confirmation Modal */}
      <Modal
        isOpen={showMoveInConfirmModal}
        onClose={() => {
          setShowMoveInConfirmModal(false);
          setMoveInBooking(null);
        }}
        title="Confirm Move In"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <div>
              <p className="font-semibold text-gray-900">Are you sure you have entered and occupied this room?</p>
              <p className="text-sm text-gray-600 mt-2">
                Once confirmed, the payment will be released according to platform rules.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowMoveInConfirmModal(false);
                setMoveInBooking(null);
              }}
              disabled={confirming}
            >
              No, Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleConfirmMoveIn}
              isLoading={confirming}
              leftIcon={<CheckCircle size={14} />}
            >
              Yes, I Have Entered
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move-In Date Selection Modal */}
      <Modal
        isOpen={showMoveInDateModal}
        onClose={() => {
          setShowMoveInDateModal(false);
          setMoveInBooking(null);
          setSelectedMoveInDate('');
        }}
        title="Select Your Move-In Date"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-12 h-12 text-blue-500" />
            <div>
              <p className="font-semibold text-gray-900">When will you move into this property?</p>
              <p className="text-sm text-gray-600 mt-2">
                Select your planned move-in date. This will be used to calculate your monthly rent payments.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Move-In Date
            </label>
            <input
              type="date"
              value={selectedMoveInDate}
              onChange={(e) => setSelectedMoveInDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowMoveInDateModal(false);
                setMoveInBooking(null);
                setSelectedMoveInDate('');
              }}
              disabled={settingDate}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSetMoveInDate}
              isLoading={settingDate}
              leftIcon={<Calendar size={14} />}
            >
              Set Move-In Date
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerBookingsPage;
