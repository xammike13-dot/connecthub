import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Eye, Trash2, AlertCircle, Clock, CheckCircle, X } from 'lucide-react';
import { customerAPI } from '../services/api';
import { orderAPI } from '../services/orderAPI';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/Toast';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  paid: { color: 'bg-purple-100 text-purple-700', label: 'Paid' },
  processing: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
  delivered: { color: 'bg-green-100 text-green-700', label: 'Delivered' },
  completed: { color: 'bg-green-200 text-green-800', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const CustomerHealthcarePage = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10, orderType: 'healthcare' };
      const { data } = await customerAPI.getMyOrders(params);
      setOrders(data?.data || []);
      setTotalPages(data?.pagination?.pages || 1);
      setTotalOrders(data?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch healthcare orders:', error);
      toastError('Failed to fetch healthcare orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const handleArchiveClick = (order) => {
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  const handleArchiveConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setArchiving(true);
      await orderAPI.archive(orderToDelete._id);
      toastSuccess('Order archived successfully');
      fetchOrders();
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to archive order');
      console.error('Failed to archive order:', error);
    } finally {
      setArchiving(false);
    }
  };

  const canArchiveOrder = (order) => {
    return order.status === 'completed' || order.status === 'cancelled';
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="w-6 h-6 text-red-500" />
            Healthcare Activity
            <span className="text-sm font-normal text-gray-500">({totalOrders} total)</span>
          </h1>
          <p className="text-gray-600 mt-2">View your healthcare orders, medicine purchases, and consultations</p>
        </div>

        {/* Orders List */}
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
        ) : orders.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No healthcare activity yet"
            message="You haven't placed any healthcare orders yet. Browse healthcare products to get started."
            actionLabel="Browse Healthcare Products"
            onAction={() => navigate('/healthcare')}
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-500">
                        Order #{order._id?.slice(-6).toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                        Healthcare
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${statusConfig[order.status]?.color}`}>
                        {statusConfig[order.status]?.label}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    <p className="text-gray-500 text-sm mt-1">
                      {order.items?.length || 0} item(s) • Total:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                      leftIcon={<Eye size={14} />}
                    >
                      View Details
                    </Button>

                    {canArchiveOrder(order) && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleArchiveClick(order)}
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

      {/* Order Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Healthcare Order Details"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">#{selectedOrder._id?.slice(-6).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded text-xs ${statusConfig[selectedOrder.status]?.color}`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium">
                  {formatCurrency(selectedOrder.finalAmount || selectedOrder.totalAmount || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium capitalize">{selectedOrder.orderType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Status</p>
                <p className="font-medium capitalize">{selectedOrder.paymentStatus}</p>
              </div>
            </div>

            {/* Products */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              <div className="space-y-3">
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.image || item.product?.images?.[0] || 'https://via.placeholder.com/60'}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(item.price || item.product?.price || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Information */}
            {selectedOrder.deliveryAddress && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Delivery Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Phone: </span>
                    <span className="text-gray-900">{selectedOrder.deliveryAddress.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Address: </span>
                    <span className="text-gray-900">{selectedOrder.deliveryAddress.address || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Timeline</h3>
                <div className="space-y-3">
                  {selectedOrder.trackingHistory.map((event, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{event.status}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.note && (
                          <p className="text-xs text-gray-600 mt-1">{event.note}</p>
                        )}
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
          setOrderToDelete(null);
        }}
        title="Archive Healthcare Order"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900">Are you sure?</p>
              <p className="text-sm text-gray-600">
                This will archive healthcare order{' '}
                <span className="font-mono">#{orderToDelete?._id?.slice(-6).toUpperCase()}</span>.
                Archived orders are hidden from your activity history.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setOrderToDelete(null);
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
              Archive Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerHealthcarePage;
