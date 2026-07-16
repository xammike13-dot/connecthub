import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  X,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Clock,
} from 'lucide-react';
import { customerAPI, orderAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

// Status configuration for display in details view only
const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
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

const renderValue = (value) => {
  if (value == null) return 'N/A';

  if (typeof value === 'object') {
    if (value.address) return value.address;
    if (value.coordinates) {
      if (Array.isArray(value.coordinates)) return value.coordinates.join(', ');
      return String(value.coordinates);
    }

    if (value?.coordinates?.lat != null && value?.coordinates?.lng != null) {
      return `${value.coordinates.lat}, ${value.coordinates.lng}`;
    }

    return JSON.stringify(value);
  }

  return value;
};

const OrdersPage = () => {
  const { orderId } = useParams();
  const { success: toastSuccess, error: toastError } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (orderId) {
      const fetchSpecificOrder = async () => {
        try {
          setLoading(true);
          const { data } = await orderAPI.getById(orderId);
          setSelectedOrder(data.data || data);
        } catch (error) {
          console.error('[OrdersPage] Failed to fetch specific order:', error);
          toastError('Failed to fetch order details.');
        } finally {
          setLoading(false);
        }
      };
      fetchSpecificOrder();
    }
  }, [orderId]);

  // Real-time order updates via socket
  useEffect(() => {
    if (!socket) return;

    const refreshOrders = () => {
      console.log('[SOCKET EVENT RECEIVED]');
      fetchOrders();
    };

    const handleOrderAccepted = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_accepted', data);
      toastSuccess(`Order accepted! Estimated delivery: ${data.message?.match(/time: (.+)/)?.[1] || 'pending'}`);
      refreshOrders();
    };

    const handleOrderCancelled = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_cancelled', data);
      toastError(`Order cancelled: ${data.message || 'Contact business for details'}`);
      refreshOrders();
    };

    const handleOrderDelivered = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_delivered', data);
      toastSuccess('Order delivered! Please confirm receipt.');
      refreshOrders();
    };

    const handleOrderCompleted = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'order_completed', data);
      toastSuccess('Order completed!');
      refreshOrders();
    };

    const handlePaymentConfirmed = (data) => {
      console.log('[SOCKET EVENT RECEIVED]', 'payment_confirmed', data);
      toastSuccess('Payment confirmed! Order created.');
      refreshOrders();
    };

    console.log('[SOCKET LISTENERS REGISTERED]', {
      order_accepted: true,
      order_delivered: true,
      order_completed: true,
      payment_confirmed: true,
    });

    socket.on('order_accepted', handleOrderAccepted);
    socket.on('order_cancelled', handleOrderCancelled);
    socket.on('order_delivered', handleOrderDelivered);
    socket.on('order_completed', handleOrderCompleted);
    socket.on('payment_confirmed', handlePaymentConfirmed);

    return () => {
      socket.off('order_accepted', handleOrderAccepted);
      socket.off('order_cancelled', handleOrderCancelled);
      socket.off('order_delivered', handleOrderDelivered);
      socket.off('order_completed', handleOrderCompleted);
      socket.off('payment_confirmed', handlePaymentConfirmed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit: 10,
        orderType: 'marketplace', // Only show marketplace orders
      };

      const { data } = await customerAPI.getMyOrders(params);

      const ordersData = data?.data || [];
      const pagination = data?.pagination || {};

      setOrders(ordersData);
      setTotalPages(pagination.pages || 1);
      setTotalOrders(pagination.total || 0);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toastError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderIdToConfirm) => {
    try {
      await orderAPI.confirmDelivery(orderIdToConfirm);

      toastSuccess('Delivery confirmed successfully');

      fetchOrders();
      setShowOrderModal(false);
    } catch (error) {
      console.error('[CONFIRM DELIVERY ERROR]', error);

      toastError(
        error.response?.data?.message ||
        'Failed to confirm delivery'
      );
    }
  };

  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setDeleting(true);
      await orderAPI.archive(orderToDelete._id);
      toastSuccess('Order archived successfully');
      fetchOrders();
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to archive order');
      console.error('Failed to archive order:', error);
    } finally {
      setDeleting(false);
    }
  };

  const canDeleteOrder = (order) => {
    return order.status === 'completed' || order.status === 'cancelled';
  };

  const canConfirmDelivered = (order) => {
    return order.paymentStatus === 'paid' && order.status === 'delivered';
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      order._id?.toLowerCase().includes(searchLower) ||
      order.items?.some((item) => item.name?.toLowerCase().includes(searchLower))
    );
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // If viewing a specific order (detailed deep-linked route)
  if (orderId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            to="/customer/orders"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Orders
          </Link>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : selectedOrder ? (
            <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
              <h1 className="text-2xl font-bold mb-4 flex items-center gap-2 text-neutral-900">
                <Package className="text-blue-600 w-7 h-7" />
                Order Details
              </h1>

              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500 font-bold">Order ID</p>
                  <p className="font-mono font-bold text-neutral-800">#{selectedOrder._id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold">Date</p>
                  <p className="font-medium text-neutral-800">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block mt-1 ${statusConfig[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold">Total Amount</p>
                  <p className="font-extrabold text-lg text-blue-600">
                    {formatCurrency(selectedOrder.finalAmount || selectedOrder.totalAmount || 0)}
                  </p>
                </div>
                {selectedOrder.orderType && (
                  <div>
                    <p className="text-sm text-gray-500 font-bold">Order Type</p>
                    <p className="font-medium capitalize text-neutral-800">{selectedOrder.orderType}</p>
                  </div>
                )}
                {selectedOrder.deliveryConfirmedAt && (
                  <div>
                    <p className="text-sm text-gray-500 font-bold">Delivery Confirmed At</p>
                    <p className="font-medium text-green-600">
                      {new Date(selectedOrder.deliveryConfirmedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Products */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 border-b pb-2 text-base">Items Ordered</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex gap-4 items-center p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <img
                        src={item.image || item.product?.images?.[0] || 'https://via.placeholder.com/60'}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover border border-neutral-200"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500 font-semibold">Qty: {item.quantity || 1}</p>
                      </div>
                      <p className="font-bold text-neutral-800">
                        {formatCurrency(item.price || item.product?.price || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Delivery Information */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 border-b pb-2 text-base">Delivery Information</h3>
                <div className="bg-neutral-50 rounded-xl p-4 space-y-2 border border-neutral-100 text-sm">
                  <div>
                    <span className="text-gray-500 font-medium">Phone: </span>
                    <span className="text-gray-900 font-bold">{selectedOrder?.deliveryAddress?.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Address: </span>
                    <span className="text-gray-900 font-semibold">{selectedOrder?.deliveryAddress?.address || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Neighborhood: </span>
                    <span className="text-gray-900 font-medium">{selectedOrder?.deliveryAddress?.neighborhood || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Landmark: </span>
                    <span className="text-gray-900 font-medium">{selectedOrder?.deliveryAddress?.landmark || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">Payment Status</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${selectedOrder.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                    }`}
                >
                  {selectedOrder.paymentStatus || 'Pending'}
                </span>
              </div>

              {/* Complete Delivery Timeline */}
              {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 border-b pb-2 text-base">Delivery Timeline</h3>
                  <div className="space-y-4">
                    {selectedOrder.trackingHistory.map((event, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 mt-0.5">
                          <Clock size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">{event.status}</p>
                          <p className="text-[11px] text-gray-400 font-bold">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                          {event.note && (
                            <p className="text-xs text-gray-600 mt-1 font-medium bg-neutral-50 p-2 rounded-lg border border-neutral-100">{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimated Delivery Time */}
              {selectedOrder.estimatedDeliveryTime && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-base">Estimated Delivery Time</h3>
                  <p className="text-sm text-neutral-600 font-semibold bg-blue-50 p-3 rounded-xl border border-blue-100 inline-block">{selectedOrder.estimatedDeliveryTime}</p>
                </div>
              )}

              {/* Business Response */}
              {selectedOrder.businessResponse === 'accepted' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-800 mb-1">Business Response</h4>
                  <p className="text-sm text-blue-700 font-medium">
                    Business accepted your order.
                    {selectedOrder.estimatedDeliveryTime && (
                      <>
                        {' '}Estimated delivery time: <span className="font-bold">{selectedOrder.estimatedDeliveryTime}</span>.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Cancellation Reason */}
              {selectedOrder.businessResponse === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-bold text-red-800 mb-1">Order Cancelled</h4>
                  <p className="text-sm text-red-700 font-semibold">
                    Business cancelled this order.
                    {selectedOrder.cancellationReason && (
                      <>
                        <br />
                        Reason: <span className="font-extrabold">{selectedOrder.cancellationReason}</span>.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Confirm Delivery Action */}
              {canConfirmDelivered(selectedOrder) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-green-800 text-base">Confirm Receipt</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your order has been delivered. Please confirm that you have received your items in good condition.
                    </p>
                  </div>
                  <Button
                    variant="success"
                    onClick={() => handleConfirmDelivery(selectedOrder._id)}
                    leftIcon={<CheckCircle2 size={16} />}
                    className="font-bold shrink-0 shadow-sm"
                  >
                    Confirm Delivery
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center border border-neutral-100">
              <AlertCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-neutral-800">Order not found</h2>
              <p className="text-neutral-500 text-sm mt-1">The order with ID {orderId} could not be located or you don't have access to it.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-6 h-6" />
            My Orders
            <span className="text-sm font-normal text-gray-500">({totalOrders} total)</span>
          </h1>
        </div>

        {/* Info Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm text-green-800 font-medium">Delivery Confirmation Required</p>
              <p className="text-sm text-green-700 mt-1">
                When your order arrives, please confirm receipt. This releases payment to the business.
                Only confirm after you have received your items in good condition.
              </p>
            </div>
          </div>
        </div>

        {/* Filters (search only - no tabs) */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders by ID or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={18} />}
                rightIcon={
                  searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600"
                      type="button"
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

        {/* Orders List - Single list, no tabs */}
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
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No marketplace orders found"
            message="You haven't placed any marketplace orders yet. Start shopping to see your orders here."
            actionLabel="Browse Marketplace"
            onAction={() => navigate('/marketplace')}
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const showButton = order.paymentStatus === 'paid' && order.status === 'delivered';

              console.log('[CUSTOMER ORDER CARD]', {
                orderId: order._id,
                status: order.status,
                paymentStatus: order.paymentStatus,
              });

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
                        {order.orderType && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 capitalize">
                            {order.orderType}
                          </span>
                        )}
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

                      {showButton && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleConfirmDelivery(order._id)}
                          leftIcon={<CheckCircle size={14} />}
                        >
                          Confirm Delivery
                        </Button>
                      )}

                      {canDeleteOrder(order) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(order)}
                          leftIcon={<Trash2 size={14} />}
                        >
                          Delete Order
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

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
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
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
              {selectedOrder.orderType && (
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{selectedOrder.orderType}</p>
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

            {/* Payment Status */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Payment Status</h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${selectedOrder.paymentStatus === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
                  }`}
              >
                {selectedOrder.paymentStatus || 'Pending'}
              </span>
            </div>

            {/* Complete Delivery Timeline */}
            {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Delivery Timeline</h3>
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

            {/* Estimated Delivery Time */}
            {selectedOrder.estimatedDeliveryTime && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Estimated Delivery Time</h3>
                <p className="text-gray-600">{selectedOrder.estimatedDeliveryTime}</p>
              </div>
            )}

            {/* Business Response */}
            {selectedOrder.businessResponse === 'accepted' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Business Accepted</h4>
                <p className="text-sm text-blue-700">
                  Business accepted your order.
                  {selectedOrder.estimatedDeliveryTime && (
                    <>
                      <br />
                      Estimated delivery time: <span className="font-semibold">{selectedOrder.estimatedDeliveryTime}</span>.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Cancellation Reason */}
            {selectedOrder.businessResponse === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Order Cancelled</h4>
                <p className="text-sm text-red-700">
                  Business cancelled this order.
                  {selectedOrder.cancellationReason && (
                    <>
                      <br />
                      Reason: <span className="font-semibold">{selectedOrder.cancellationReason}</span>.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Confirm Delivery Action */}
            {canConfirmDelivered(selectedOrder) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Confirm Receipt</h4>
                <p className="text-sm text-green-700 mb-3">
                  Your order has been delivered. Please confirm that you have received your items.
                </p>
                <Button
                  variant="success"
                  onClick={() => handleConfirmDelivery(selectedOrder._id)}
                  leftIcon={<CheckCircle size={16} />}
                >
                  Confirm Delivery
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setOrderToDelete(null);
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
                This will archive order{' '}
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
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleting}
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

export default OrdersPage;