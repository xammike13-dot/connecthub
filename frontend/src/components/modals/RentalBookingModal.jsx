import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, X, Loader2 } from 'lucide-react';
import { rentalAPI } from '../../services/api';
import { useToast } from '../Toast';
import Modal from '../ui/Modal';

const RentalBookingModal = ({ rental, isOpen, onClose, onBookingCreated }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toastError('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      toastError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      console.log('[RENTAL BOOKING] Creating booking:', {
        rentalId: rental._id,
        startDate,
        endDate,
      });

      const response = await rentalAPI.bookRental(rental._id, {
        startDate,
        endDate,
      });

      console.log('[RENTAL BOOKING] Booking created:', response.data);

      const bookingId = response.data.data.booking._id;
      toastSuccess('Booking created successfully');

      // Pass bookingId to parent component
      onBookingCreated(bookingId, rental);
      onClose();
    } catch (error) {
      console.error('[RENTAL BOOKING] Error:', error);
      toastError(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const minEndDate = startDate ? new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : today;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Book Rental</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-lg text-gray-900">{rental.rentalName}</h3>
          <p className="text-sm text-gray-500">{rental.location}</p>
          <p className="text-lg font-bold text-blue-600 mt-2">
            KSh {rental.monthlyPrice?.toLocaleString()}/month
          </p>
        </div>

        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                Start Date
              </div>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                End Date
              </div>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={minEndDate}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {startDate && endDate && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Duration:</span>{' '}
                {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Booking...
              </>
            ) : (
              'Create Booking'
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          You'll proceed to payment after creating the booking
        </p>
      </motion.div>
    </Modal>
  );
};

export default RentalBookingModal;
