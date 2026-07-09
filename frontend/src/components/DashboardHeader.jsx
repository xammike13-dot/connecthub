import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { notificationAPI } from '../services/api';
import { Check, Trash2, CheckCheck } from 'lucide-react';

const DashboardHeader = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markNotificationsRead } = useSocket();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const visibleNotifications = notifications?.slice(0, 4) || [];

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      markNotificationsRead([notificationId]);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationAPI.delete(notificationId);
      // The socket context will handle removing it from the list
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      const unreadIds = notifications.filter(n => !n.read).map(n => n._id || n.id);
      markNotificationsRead(unreadIds);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification._id || notification.id);
    }
    // No navigation - notifications are text only
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="bg-white border-b border-neutral-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Here's what's happening with your account today.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search..."
              className="input-field pl-10 pr-4 py-2 w-64"
            />
            <svg
              className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-[9999]">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {visibleNotifications.length === 0 ? (
                    <div className="p-4 text-neutral-500">
                      No notifications available.
                    </div>
                  ) : (
                    visibleNotifications.map((notification) => (
                      <div
                        key={notification._id || notification.id}
                        className={`p-4 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors ${notification.read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-500'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(notification)}>
                            <p className={`text-sm ${notification.read ? 'text-neutral-600' : 'font-semibold text-neutral-900'} truncate`}>
                              {notification.title || notification.message}
                            </p>
                            <p className="text-neutral-500 text-xs mt-1 truncate">{notification.message}</p>
                            <p className="text-neutral-400 text-xs mt-1">{formatTime(notification.createdAt)}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification._id || notification.id);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="Mark as read"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification._id || notification.id);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                  <Link
                    to={`/${user?.role}/notifications`}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700 block text-center"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
            <div className="text-right hidden md:block">
              <p className="font-semibold text-neutral-900 text-sm">{user?.name}</p>
              <p className="text-xs text-neutral-500 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
              <span className="text-blue-600 font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;