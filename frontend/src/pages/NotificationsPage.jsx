import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ShoppingBag,
  Bike,
  Home,
  CreditCard,
  MessageCircle,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Phone,
  Eye,
  AlertCircle,
  Heart,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { notificationAPI, rentalAPI, rideAPI, orderAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const notificationIcons = {
  order: ShoppingBag,
  order_update: ShoppingBag,
  order_accepted: ShoppingBag,
  order_delivered: ShoppingBag,
  new_order: ShoppingBag,
  order_payment_confirmed: CreditCard,
  delivery_confirmed: CheckCheck,
  payment: CreditCard,
  payment_received: CreditCard,
  ride_request: Bike,
  ride_accepted: Bike,
  ride_completed: Bike,
  booking: Home,
  booking_confirmed: Home,
  booking_request: Home,
  rental_booking: Home,
  message: MessageCircle,
  system: Bell,
  healthcare: Heart,
  ride_payment_confirmed: CreditCard,
  ride_payment_failed: CreditCard,
};

const notificationColors = {
  order: 'bg-blue-500',
  order_update: 'bg-blue-500',
  order_accepted: 'bg-green-500',
  order_delivered: 'bg-blue-500',
  new_order: 'bg-green-500',
  order_payment_confirmed: 'bg-green-500',
  delivery_confirmed: 'bg-green-500',
  payment: 'bg-green-500',
  payment_received: 'bg-green-500',
  ride_request: 'bg-purple-500',
  ride_accepted: 'bg-purple-500',
  ride_completed: 'bg-green-500',
  booking: 'bg-orange-500',
  booking_confirmed: 'bg-green-500',
  booking_request: 'bg-orange-500',
  rental_booking: 'bg-orange-500',
  message: 'bg-indigo-500',
  system: 'bg-gray-500',
  healthcare: 'bg-red-500',
  ride_payment_confirmed: 'bg-green-500',
  ride_payment_failed: 'bg-red-500',
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, notifications: socketNotifications, unreadCount, markNotificationsRead } = useSocket();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'order', 'rental', 'ride', 'healthcare', 'payment', 'system'
  const [localNotifications, setLocalNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, notificationId: null });
  const [actionProcessing, setActionProcessing] = useState({});

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Socket listener for auto-refresh
  useEffect(() => {
    if (!socket) return;

    const refreshNotifications = () => {
      fetchNotifications();
    };

    socket.on('new_notification', refreshNotifications);
    return () => {
      socket.off('new_notification', refreshNotifications);
    };
  }, [socket]);

  // Synchronize new socket notifications
  useEffect(() => {
    if (socketNotifications.length > 0) {
      setLocalNotifications(prev => {
        const updated = [...prev];
        socketNotifications.forEach(socketNotif => {
          const exists = updated.find(n => n._id === socketNotif._id || n.id === socketNotif.id);
          if (!exists) {
            updated.unshift(socketNotif);
          }
        });
        return updated;
      });
    }
  }, [socketNotifications]);

  const fetchNotifications = async () => {
    try {
      if (loading) setLoading(true);
      const { data } = await notificationAPI.getAll();
      setLocalNotifications(data.data || []);
    } catch (error) {
      console.error('[NOTIFICATIONS PAGE - FETCH ERROR]', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setLocalNotifications(prev => prev.map(n =>
        n._id === notificationId ? { ...n, read: true, status: 'read' } : n
      ));
      markNotificationsRead([notificationId]);
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true, status: 'read' })));
      markNotificationsRead(localNotifications.filter(n => !n.read).map(n => n._id));
      toastSuccess('All notifications marked as read');
    } catch (error) {
      toastError('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId) => {
    setDeleteDialog({ open: true, notificationId });
  };

  const confirmDelete = async () => {
    const { notificationId } = deleteDialog;
    try {
      setLocalNotifications(prev => prev.filter(n => n._id !== notificationId));
      setDeleteDialog({ open: false, notificationId: null });
      await notificationAPI.delete(notificationId);
      toastSuccess('Notification deleted');
    } catch (error) {
      fetchNotifications();
      toastError('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationAPI.deleteAll();
      setLocalNotifications([]);
      toastSuccess('All notifications cleared');
    } catch (error) {
      toastError('Failed to clear notifications');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  // Immediate inline actions inside notifications
  const handleAction = async (notif, actionType, event) => {
    event.stopPropagation(); // Avoid triggering card click navigation
    const notifId = notif._id;
    const orderId = notif.data?.orderId;
    const bookingId = notif.data?.bookingId;
    const rentalId = notif.data?.rentalId;
    const rideId = notif.data?.rideId;

    setActionProcessing(prev => ({ ...prev, [notifId]: true }));

    try {
      if (actionType === 'confirm_delivery') {
        await orderAPI.confirmDelivery(orderId);
        toastSuccess('Delivery confirmed successfully. Funds released!');
      } else if (actionType === 'report_problem') {
        navigate('/support');
        toastSuccess('Redirecting to support desk');
      } else if (actionType === 'message_landlord') {
        navigate('/customer/chat');
        toastSuccess('Opening chats');
      } else if (actionType === 'track_rider') {
        navigate('/customer/rides');
        toastSuccess('Redirecting to ride timeline');
      } else if (actionType === 'call_rider') {
        window.location.href = `tel:${notif.data?.riderPhone || '0748459757'}`;
      } else if (actionType === 'cancel_ride') {
        await rideAPI.cancel(rideId);
        toastSuccess('Ride cancelled successfully');
      } else if (actionType === 'accept_order') {
        await orderAPI.accept(orderId, '30 mins');
        toastSuccess('Order accepted! Customer notified.');
      } else if (actionType === 'reject_order') {
        await orderAPI.businessCancel(orderId, 'Out of stock');
        toastSuccess('Order cancelled');
      } else if (actionType === 'approve_booking') {
        await rentalAPI.updateBookingStatus(rentalId, bookingId, { status: 'confirmed', paymentStatus: 'paid' });
        toastSuccess('Booking approved successfully!');
      } else if (actionType === 'decline_booking') {
        await rentalAPI.updateBookingStatus(rentalId, bookingId, { status: 'cancelled', declineReason: 'Declined via notification' });
        toastSuccess('Booking declined');
      } else if (actionType === 'accept_ride') {
        await rideAPI.accept(rideId);
        toastSuccess('Ride accepted successfully!');
        navigate('/rider/dashboard');
      } else if (actionType === 'reject_ride') {
        await rideAPI.decline(rideId, { reason: 'Unavailable' });
        toastSuccess('Ride declined');
      }

      // Mark notification as read after action completes
      if (!notif.read) {
        await handleMarkAsRead(notifId);
      }

      // Refresh notifications and user dashboard contexts
      fetchNotifications();
    } catch (error) {
      console.error('[NOTIFICATION ACTION ERROR]', error);
      toastError(error.response?.data?.message || 'Failed to process action');
    } finally {
      setActionProcessing(prev => ({ ...prev, [notifId]: false }));
    }
  };

  // Deep linking: navigate to the exact record
  const handleCardClick = async (notif) => {
    if (!notif.read) {
      await handleMarkAsRead(notif._id);
    }

    const role = user?.role || 'customer';
    const entityId = notif.relatedEntityId || notif.data?.orderId || notif.data?.bookingId || notif.data?.rentalId || notif.data?.rideId || notif.data?.paymentId || notif.data?.healthcareOrderId || notif.data?.transactionId || notif.data?.transactionRef;

    if (notif.notificationType === 'order') {
      if (role === 'business') {
        navigate(`/business/orders?orderId=${entityId || ''}`);
      } else {
        navigate(`/customer/order/${entityId || ''}`);
      }
    } else if (notif.notificationType === 'healthcare') {
      navigate(`/customer/healthcare?healthcareOrderId=${entityId || ''}`);
    } else if (notif.notificationType === 'rental') {
      if (role === 'landlord') {
        navigate(`/landlord/bookings?bookingId=${entityId || ''}`);
      } else {
        navigate(`/customer/bookings?bookingId=${entityId || ''}`);
      }
    } else if (notif.notificationType === 'ride') {
      if (role === 'rider') {
        navigate(`/rider/requests?rideId=${entityId || ''}`);
      } else {
        navigate(`/customer/rides?rideId=${entityId || ''}`);
      }
    } else if (notif.notificationType === 'payment') {
      navigate(`/${role}/transactions?transactionId=${entityId || ''}`);
    } else if (notif.navigationTarget) {
      navigate(notif.navigationTarget);
    } else if (notif.actionUrl) {
      window.location.href = notif.actionUrl;
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Filter notifications by categories (orders, rentals, rides, healthcare, payments, system)
  const filteredNotifications = localNotifications.filter((notif) => {
    if (activeTab === 'all') return true;
    return notif.notificationType === activeTab;
  });

  // Priority sorting helper
  const getNotificationPriority = (notif) => {
    if (notif.actionRequired && !notif.read) return 1;
    if (notif.notificationType === 'order' && !notif.read) return 2;
    if (notif.notificationType === 'ride' && !notif.read) return 3;
    if (notif.notificationType === 'rental' && !notif.read) return 4;
    if (notif.notificationType === 'payment' && !notif.read) return 5;
    return 6;
  };

  // Sort: (1) priority level, (2) newest first within priority
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const pA = getNotificationPriority(a);
    const pB = getNotificationPriority(b);
    if (pA !== pB) {
      return pA - pB;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 flex items-center gap-3">
              <Bell className="w-7 h-7 text-blue-600 animate-bounce" />
              Smart Notification Center
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Actionable alerts, updates, and deep-linking directly to what matters.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 font-bold">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="font-bold">
                Mark All Read
              </Button>
            )}
            {localNotifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll} className="font-bold text-red-600 border-red-200 hover:bg-red-50">
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-none bg-white p-1.5 border border-neutral-200/80 rounded-xl shadow-sm">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'order', label: 'Orders' },
            { id: 'rental', label: 'Rentals' },
            { id: 'ride', label: 'Rides' },
            { id: 'healthcare', label: 'Healthcare' },
            { id: 'payment', label: 'Payments' },
            { id: 'system', label: 'System' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-150 ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200">
              <Bell className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-extrabold text-neutral-900 mb-2">
              No notifications here
            </h3>
            <p className="text-neutral-500 text-sm max-w-sm mx-auto">
              There are no {activeTab === 'all' ? '' : activeTab} notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sortedNotifications.map((notif) => {
                const notifType = notif.type || 'system';
                const Icon = notificationIcons[notifType] || notificationIcons[notif.notificationType] || Bell;
                const color = notificationColors[notifType] || notificationColors[notif.notificationType] || 'bg-neutral-500';
                const notificationId = notif._id;
                const isProcessing = actionProcessing[notificationId];

                return (
                  <motion.div
                    key={notificationId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -2 }}
                    onClick={() => handleCardClick(notif)}
                    className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${!notif.read
                      ? 'border-l-4 border-l-blue-600 border-blue-300 bg-blue-50/70 hover:bg-blue-50'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50/50 opacity-85'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left Side: Icon */}
                      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Middle: Title, message, timestamp, action required flag */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm ${!notif.read ? 'text-base font-extrabold text-blue-900' : 'font-normal text-neutral-500'}`}>
                            {notif.title || 'Notification Update'}
                          </h3>
                          {notif.actionRequired && !notif.read && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                              <AlertCircle size={10} className="stroke-[3]" />
                              Action Required
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 leading-relaxed ${!notif.read ? 'text-blue-950 font-semibold' : 'text-neutral-400 font-normal'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-2 font-bold flex items-center gap-2">
                          <span>{formatTime(notif.createdAt)}</span>
                          <span>•</span>
                          <span className="text-blue-600 hover:underline flex items-center gap-1 font-extrabold">
                            <Eye size={12} />
                            View Record
                          </span>
                        </p>

                        {/* Feature 3: Actionable Inline Buttons */}
                        {notif.actionRequired && !notif.read && (
                          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap gap-2.5">
                            {/* Order Delivered Buttons */}
                            {notifType === 'order_delivered' && (
                              <>
                                <button
                                  onClick={(e) => handleAction(notif, 'confirm_delivery', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  {isProcessing ? 'Processing...' : 'Confirm Delivery'}
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'report_problem', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl shadow-sm transition-all border border-red-100 disabled:opacity-50"
                                >
                                  Report Problem
                                </button>
                              </>
                            )}

                            {/* Rental Approved Buttons */}
                            {notifType === 'booking_confirmed' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/customer/bookings');
                                  }}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                                >
                                  View Booking
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'message_landlord', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  Message Landlord
                                </button>
                              </>
                            )}

                            {/* Customer Ride Request Buttons */}
                            {notif.notificationType === 'ride' && user?.role === 'customer' && (
                              <>
                                <button
                                  onClick={(e) => handleAction(notif, 'track_rider', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                                >
                                  Track Rider
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'call_rider', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-extrabold text-xs rounded-xl shadow-sm transition-all border border-green-100 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Phone size={11} className="stroke-[2.5]" />
                                  Call Rider
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'cancel_ride', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl shadow-sm transition-all border border-red-100 disabled:opacity-50"
                                >
                                  Cancel Ride
                                </button>
                              </>
                            )}

                            {/* Business Order Response Buttons */}
                            {notifType === 'new_order' && user?.role === 'business' && (
                              <>
                                <button
                                  onClick={(e) => handleAction(notif, 'accept_order', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  {isProcessing ? 'Processing...' : 'Accept Order'}
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'reject_order', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  Reject Order
                                </button>
                              </>
                            )}

                            {/* Landlord Booking Buttons */}
                            {(notifType === 'new_booking' || notifType === 'booking_request') && user?.role === 'landlord' && (
                              <>
                                <button
                                  onClick={(e) => handleAction(notif, 'approve_booking', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  {isProcessing ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'decline_booking', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </>
                            )}

                            {/* Rider Ride Request Buttons */}
                            {notifType === 'ride_request' && user?.role === 'rider' && (
                              <>
                                <button
                                  onClick={(e) => handleAction(notif, 'accept_ride', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  {isProcessing ? 'Processing...' : 'Accept Ride'}
                                </button>
                                <button
                                  onClick={(e) => handleAction(notif, 'reject_ride', e)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                                >
                                  Reject Ride
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Read Indicator & Delete button */}
                      <div className="flex sm:flex-col items-center gap-2 justify-end">
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notificationId);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notificationId);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {deleteDialog.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
              onClick={() => setDeleteDialog({ open: false, notificationId: null })}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-neutral-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-extrabold text-neutral-900">Delete Notification</h3>
                </div>
                <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete this notification? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialog({ open: false, notificationId: null })}
                    className="font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmDelete}
                    className="font-bold"
                  >
                    Delete Alert
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationsPage;