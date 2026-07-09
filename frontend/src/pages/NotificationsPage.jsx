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
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import { notificationAPI } from '../services/api';
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
  ride_payment_confirmed: 'bg-green-500',
  ride_payment_failed: 'bg-red-500',
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { socket, notifications: socketNotifications, unreadCount, markNotificationsRead, clearNotifications } = useSocket();

  const { success: toastSuccess, error: toastError } = useToast();

  const [filter, setFilter] = useState('all');
  const [localNotifications, setLocalNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, notificationId: null });

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const refreshNotifications = (data) => {
      fetchNotifications();
      toastSuccess('You have a new notification');
    };

    // Prevent duplicate listeners: ensure this effect only runs once per socket instance
    socket.on('new_notification', refreshNotifications);

    return () => {
      socket.off('new_notification', refreshNotifications);
    };
  }, [socket]);




  useEffect(() => {
    // Update local notifications when socket notifications change
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
      setLoading(true);
      const { data } = await notificationAPI.getAll();
      setLocalNotifications(data.data || []);
    } catch (error) {
      console.error('[NOTIFICATIONS PAGE - FETCH ERROR]', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = localNotifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const handleNotificationClick = async (notif) => {
    // Mark as read when clicked
    if (!notif.read) {
      await handleMarkAsRead(notif._id);
    }
    // No navigation - notifications are text only
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setLocalNotifications(prev => prev.map(n =>
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      toastError('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
      // Optimistic UI update
      setLocalNotifications(prev => prev.filter(n => n._id !== notificationId));
      setDeleteDialog({ open: false, notificationId: null });

      await notificationAPI.delete(notificationId);
      toastSuccess('Notification deleted');
    } catch (error) {
      // Revert on error
      fetchNotifications();
      toastError('Failed to delete notification');
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ open: false, notificationId: null });
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

  // Use the message from the backend directly instead of generating fake messages
  const getNotificationDisplay = (notif) => {
    // Use the message from backend directly
    return notif.message || 'New notification';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="w-6 h-6" />
              Notifications
              {localNotifications.filter(n => !n.read).length > 0 && (
                <span className="bg-red-500 text-white text-sm font-medium px-2 py-0.5 rounded-full">
                  {localNotifications.filter(n => !n.read).length}
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Stay updated with your orders, rides, and bookings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </Button>
            {localNotifications.filter(n => !n.read).length > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                Mark all read
              </Button>
            )}
            {localNotifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'read', label: 'Read' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No notifications
            </h3>
            <p className="text-gray-500">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notif) => {
                const notifType = notif.type || 'system';
                const Icon = notificationIcons[notifType] || Bell;
                const color = notificationColors[notifType] || 'bg-gray-500';
                // Use _id as key and for actions
                const notificationId = notif._id;

                return (
                  <motion.div
                    key={notificationId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-lg transition-all cursor-pointer ${!notif.read ? 'border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white' : 'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {notif.title || getNotificationDisplay(notif)}
                        </p>
                        <p className={`text-xs mt-1 ${!notif.read ? 'text-gray-700' : 'text-gray-500'}`}>
                          {getNotificationDisplay(notif)}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          {formatTime(notif.createdAt)}
                          {notif.data?.orderId && (
                            <span className="text-blue-500 font-medium">• View Order</span>
                          )}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notificationId);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
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
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={cancelDelete}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Notification</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this notification? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={cancelDelete}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmDelete}
                  >
                    Delete
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