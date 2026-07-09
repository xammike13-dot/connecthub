import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  Eye,
  User,
  Truck,
  Info,
  Trash2,
} from 'lucide-react';
import { businessAPI, orderAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Package },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: Truck },
  completed: { label: 'Completed', color: 'bg-green-200 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const BusinessOrdersPage = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToAction, setOrderToAction] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, currentPage: 1 });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  const selectedFilter = statusFilter;

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, pagination.currentPage]);

  // Real-time order updates via socket
  useEffect(() => {
    if (!socket) return;

    const refreshOrders = () => {
      console.log('[SOCKET EVENT RECEIVED]');
      fetchOrders();
    };

    const handleNewOrder = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'new_order', data);
      toastSuccess(`New order received! Order #${data.orderId?.slice(-6).toUpperCase()}`);
      refreshOrders();
    };

    const handleOrderAccepted = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_accepted', data);
      refreshOrders();
    };

    const handleOrderDelivered = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_delivered', data);
      refreshOrders();
    };

    const handleOrderCompleted = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_completed', data);
      refreshOrders();
    };

    const handlePaymentConfirmed = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'payment_confirmed', data);
      refreshOrders();
    };

    const handleOrderCancelled = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_cancelled', data);
      toastError(`Order cancelled: ${data.message || 'Customer cancelled the order'}`);
      refreshOrders();
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_accepted', handleOrderAccepted);
    socket.on('order_delivered', handleOrderDelivered);
    socket.on('order_completed', handleOrderCompleted);
    socket.on('payment_confirmed', handlePaymentConfirmed);
    socket.on('order_cancelled', handleOrderCancelled);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_accepted', handleOrderAccepted);
      socket.off('order_delivered', handleOrderDelivered);
      socket.off('order_completed', handleOrderCompleted);
      socket.off('payment_confirmed', handlePaymentConfirmed);
      socket.off('order_cancelled', handleOrderCancelled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { limit: 10, page: pagination.currentPage };
      if (statusFilter !== 'all') params.status = statusFilter;

      const { data } = await businessAPI.getOrders(params);

      console.log('[BUSINESS ORDERS UI]', {
        totalFromAPI: (data?.data?.length || data?.orders?.length || 0),
        filteredOrders: 0,
        selectedFilter,
      });

      setOrders(data.data || data.orders || []);
      setPagination(data.pagination || { total: 0, pages: 0, currentPage: 1 });
    } catch (error) {
      toastError('Failed to fetch orders');
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Status filter map for client-side filtering
  const statusFilterMap = {
    all: null,
    pending: ['pending', 'paid', 'processing'],
    completed: ['completed', 'delivered'],
    cancelled: ['cancelled'],
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilterMap[statusFilter] === null
        ? true
        : statusFilterMap[statusFilter].includes(order.status);

    if (!matchesStatus) return false;

    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      order._id.toLowerCase().includes(searchLower) ||
      order.customer?.name?.toLowerCase().includes(searchLower)
    );
  });

  console.log('[BUSINESS ORDERS UI]', {
    totalFromAPI: orders.length,
    filteredOrders: filteredOrders.length,
    selectedFilter,
  });

  // Handle opening accept modal
  const handleOpenAcceptModal = (order) => {
    setOrderToAction(order);
    setEstimatedDeliveryTime('');
    setShowAcceptModal(true);
  };

  // Handle accepting an order
  const handleAcceptOrder = async () => {
    if (!estimatedDeliveryTime.trim()) {
      toastError('Please enter estimated delivery time');
      return;
    }

    try {
      console.log('[ACCEPT ORDER START]');

      setUpdating(true);
      await orderAPI.accept(orderToAction._id, estimatedDeliveryTime);

      console.log('[ACCEPT SUCCESS]');

      toastSuccess('Order accepted successfully. Customer has been notified.');

      setShowAcceptModal(false);
      setOrderToAction(null);
      setEstimatedDeliveryTime('');

      await fetchOrders();
    } catch (error) {
      console.error('[ACCEPT ORDER ERROR]', error);

      toastError(
        error.response?.data?.message || 'Failed to accept order'
      );
    } finally {
      setUpdating(false);
    }
  };

  // Handle opening cancel modal
  const handleOpenCancelModal = (order) => {
    setOrderToAction(order);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  // Handle cancelling an order
  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      toastError('Please enter cancellation reason');
      return;
    }

    try {
      setUpdating(true);
      await orderAPI.businessCancel(orderToAction._id, cancellationReason);
      toastSuccess('Order cancelled successfully');
      fetchOrders();
      setShowCancelModal(false);
      setOrderToAction(null);
      setCancellationReason('');
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to cancel order');
      console.error('Failed to cancel order:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle marking order as delivered
  const handleMarkDelivered = async (orderId) => {
    try {
      console.log('[DELIVER START]');

      setUpdating(true);
      await orderAPI.markDelivered(orderId);

      console.log('[DELIVER SUCCESS]');

      toastSuccess('Order marked as delivered successfully. Customer has been notified.');

      setShowModal(false);
      await fetchOrders();
    } catch (error) {
      console.error('[DELIVER ERROR]', error);

      toastError(
        error.response?.data?.message || 'Failed to mark order as delivered'
      );
    } finally {
      setUpdating(false);
    }
  };

  // Handle opening delete modal
  const handleOpenDeleteModal = (order) => {
    setOrderToAction(order);
    setShowDeleteModal(true);
  };

  // Handle deleting an order
  const handleDeleteOrder = async () => {
    if (!orderToAction) return;

    try {
      setDeleting(true);
      await orderAPI.delete(orderToAction._id);
      toastSuccess('Order deleted successfully');
      fetchOrders();
      setShowDeleteModal(false);
      setOrderToAction(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to delete order');
      console.error('Failed to delete order:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Check if order can be deleted
  const canDeleteOrder = (order) => {
    return order.status === 'completed' || order.status === 'cancelled';
  };

  // Check if order can be accepted (pending/paid status)
  const canAcceptOrder = (order) => {
    return order.status === 'pending' || order.status === 'paid';
  };

  // Check if order can be marked as delivered (processing status)
  const canMarkDelivered = (order) => {
    return order.status === 'processing';
  };

  // Check if order can be cancelled by business
  const canBusinessCancel = (order) => {
    return (order.status === 'pending' || order.status === 'paid' || order.status === 'processing') &&
      order.businessResponse !== 'cancelled';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-6 h-6" />
            Manage Orders
          </h1>
          <p className="text-gray-500 mt-1">View and manage orders for your products</p>
        </div>

        {/* Tabs (ONLY these four) */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'pending', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {status === 'all' ? 'All Orders' : status === 'pending' ? 'Pending Orders' : status === 'completed' ? 'Completed Orders' : 'Cancelled Orders'}
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Order Workflow</p>
              <p className="text-sm text-blue-700 mt-1">
                Accept pending orders with an estimated delivery time, mark them as delivered when ready,
                and wait for customers to confirm receipt before payment is released to your wallet.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders by ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={18} />}
                rightIcon={
                  searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )
                }
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {statusFilter === 'all'
                ? "You haven't received any orders yet."
                : `No ${statusFilter} orders at the moment.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
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
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={14} />
                        <span>{order.customer?.name || 'Customer'}</span>
                        <span className="mx-2">•</span>
                        <span>{order.items?.length || 0} items</span>
                        <span className="mx-2">•</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      {order.estimatedDeliveryTime && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          Est. delivery: {order.estimatedDeliveryTime}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowModal(true);
                        }}
                        leftIcon={<Eye size={14} />}
                      >
                        View Details
                      </Button>

                      {canAcceptOrder(order) && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenAcceptModal(order)}
                        >
                          Accept Order
                        </Button>
                      )}

                      {canBusinessCancel(order) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCancelModal(order)}
                        >
                          Cancel Order
                        </Button>
                      )}

                      {canMarkDelivered(order) && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMarkDelivered(order._id)}
                        >
                          Mark as Delivered
                        </Button>
                      )}

                      {canDeleteOrder(order) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(order)}
                          leftIcon={<Trash2 size={14} />}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
              disabled={pagination.currentPage === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Order Details"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">#{selectedOrder._id?.slice(-6).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedOrder.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {new Date(selectedOrder.createdAt).toLocaleDateString()}
                </p>
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
                <p className="text-sm text-gray-500">Payment</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded text-xs ${selectedOrder.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {selectedOrder.paymentStatus || 'pending'}
                  </span>
                </p>
              </div>
              {selectedOrder.estimatedDeliveryTime && (
                <div>
                  <p className="text-sm text-gray-500">Est. Delivery</p>
                  <p className="font-medium">{selectedOrder.estimatedDeliveryTime}</p>
                </div>
              )}
              {selectedOrder.deliveryConfirmedAt && (
                <div>
                  <p className="text-sm text-gray-500">Delivery Confirmed</p>
                  <p className="font-medium text-green-600">
                    {new Date(selectedOrder.deliveryConfirmedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
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
                      <p className="font-medium text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(item.price * item.quantity || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Delivery Information */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Customer Delivery Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Phone: </span>
                  <span className="text-gray-900">{selectedOrder?.deliveryAddress?.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Address: </span>
                  <span className="text-gray-900">{selectedOrder?.deliveryAddress?.address || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Neighborhood: </span>
                  <span className="text-gray-900">{selectedOrder?.deliveryAddress?.neighborhood || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Landmark: </span>
                  <span className="text-gray-900">{selectedOrder?.deliveryAddress?.landmark || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Delivery Timeline */}
            {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Tracking History</h3>
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

            {/* Status Info */}
            {selectedOrder.status === 'delivered' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> This order has been delivered. The customer needs to confirm receipt.
                  Once confirmed, the order will be marked as completed and payment released to your wallet.
                </p>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="flex gap-2 pt-4 border-t">
              {canAcceptOrder(selectedOrder) && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowModal(false);
                    handleOpenAcceptModal(selectedOrder);
                  }}
                >
                  Accept Order
                </Button>
              )}
              {canMarkDelivered(selectedOrder) && (
                <Button
                  variant="primary"
                  onClick={() => handleMarkDelivered(selectedOrder._id)}
                  isLoading={updating}
                >
                  Mark as Delivered
                </Button>
              )}
              {canBusinessCancel(selectedOrder) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    handleOpenCancelModal(selectedOrder);
                  }}
                >
                  Cancel Order
                </Button>
              )}
              {canDeleteOrder(selectedOrder) && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setShowModal(false);
                    handleOpenDeleteModal(selectedOrder);
                  }}
                >
                  Delete Order
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Accept Order Modal */}
      <Modal
        isOpen={showAcceptModal}
        onClose={() => {
          setShowAcceptModal(false);
          setOrderToAction(null);
          setEstimatedDeliveryTime('');
        }}
        title="Accept Order"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Accept order #{orderToAction?._id?.slice(-6).toUpperCase()} and provide an estimated delivery time.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Delivery Time *
            </label>
            <input
              type="text"
              value={estimatedDeliveryTime}
              onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
              placeholder="Enter estimated delivery time (e.g. 2 hours, 3 days, 1 week)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAcceptModal(false);
                setOrderToAction(null);
                setEstimatedDeliveryTime('');
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAcceptOrder}
              isLoading={updating}
            >
              Accept Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setOrderToAction(null);
          setCancellationReason('');
        }}
        title="Cancel Order"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-10 h-10 text-orange-500" />
            <div>
              <p className="font-semibold text-gray-900">Cancel this order?</p>
              <p className="text-sm text-gray-600">
                This will notify the customer and the order cannot be reinstated.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Reason *
            </label>
            <select
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a reason</option>
              <option value="Out of stock">Out of stock</option>
              <option value="Delivery unavailable">Delivery unavailable</option>
              <option value="Product unavailable">Product unavailable</option>
              <option value="Incorrect order">Incorrect order</option>
              <option value="Customer requested">Customer requested cancellation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setOrderToAction(null);
                setCancellationReason('');
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelOrder}
              isLoading={updating}
            >
              Cancel Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setOrderToAction(null);
        }}
        title="Delete Order"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <p className="font-semibold text-gray-900">Are you sure?</p>
              <p className="text-sm text-gray-600">
                This action cannot be undone. This will permanently delete order{' '}
                <span className="font-mono">#{orderToAction?._id?.slice(-6).toUpperCase()}</span>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setOrderToAction(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteOrder}
              isLoading={deleting}
              leftIcon={<Trash2 size={14} />}
            >
              Delete Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BusinessOrdersPage;