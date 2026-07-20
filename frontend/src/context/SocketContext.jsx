import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationPermissionRequested = useRef(false);
  const shownNotificationIds = useRef(new Set());

  // Automatically update the PWA App Badge count when the unread count changes
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(err => console.error('[AppBadge] Error setting:', err));
      } else {
        navigator.clearAppBadge().catch(err => console.error('[AppBadge] Error clearing:', err));
      }
    }
  }, [unreadCount]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) return;
    try {
      const { data } = await notificationAPI.getAll({ page: 1, limit: 20 });
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [token, user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || !user) return;
    try {
      const { data } = await notificationAPI.getUnreadCount();
      setUnreadCount(data.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread notifications count:', error);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      const apiBaseUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
      const socketUrl = import.meta.env.VITE_SOCKET_URL || apiBaseUrl.replace(/\/api$/, '');

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        withCredentials: true,
        path: '/socket.io',
      });

      newSocket.on('connect', () => {
        setIsConnected(true);

        // Join user-specific room for payment confirmations and notifications
        if (user?._id) {
          const userRoom = `user_${user._id}`;
          newSocket.emit('join_room', userRoom);
          console.log('[SocketContext] Joined user room:', userRoom);
        }

        // Join rider-specific room for ride requests
        if (user?.role === 'rider' && user?._id) {
          const riderRoom = `rider_${user._id}`;
          newSocket.emit('join_room', riderRoom);
          console.log('[SocketContext] Joined rider room:', riderRoom);
        }

        // Request browser notification permission once after socket connects
        if ('Notification' in window && !notificationPermissionRequested.current) {
          notificationPermissionRequested.current = true;
          if (Notification.permission !== 'granted') {
            Notification.requestPermission();
          }
        }
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        setIsConnected(false);
      });

      // User list updates
      newSocket.on('users:online', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('user:online', (userId) => {
        setOnlineUsers((prev) =>
          prev.includes(userId) ? prev : [...prev, userId]
        );
      });

      newSocket.on('user:offline', (userId) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      // Real-time notification updates from backend
      newSocket.on('new_notification', (notification) => {
        // Prevent duplicate notifications
        if (shownNotificationIds.current.has(notification._id)) {
          return;
        }
        shownNotificationIds.current.add(notification._id);

        // Limit stored notifications to prevent memory issues
        setNotifications((prev) => {
          const filtered = prev.filter((n) => n._id !== notification._id);
          return [notification, ...filtered].slice(0, 100);
        });
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const title = notification.title || 'New Notification';
            const body = notification.message || '';
            const icon = '/logo.png';

            // Check if document is not focused to avoid duplicate with in-app notification
            if (document.visibilityState === 'visible' && document.hasFocus()) {
              // User is looking at the app, skip browser notification to avoid annoyance
            } else {
              const browserNotif = new Notification(title, {
                body,
                icon,
                tag: notification._id, // Use tag to prevent duplicates
                requireInteraction: false,
              });

              browserNotif.onclick = () => {
                window.focus();
                browserNotif.close();
              };
            }
          } catch (error) {
            console.error('[BROWSER NOTIFICATION] Error showing notification:', error);
          }
        }
      });

      newSocket.on('chat:message', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('chat:read', ({ conversationId, userId }) => {
        // Optional chat read feedback can be handled here
      });

      newSocket.on('order_created', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('order_accepted', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('order_cancelled', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('order_delivered', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('order_completed', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('payment_confirmed', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('ride_request', (data) => {
        console.log('[SocketContext] ride_request received:', data);
        fetchUnreadCount();
      });

      newSocket.on('ride_accepted', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('rider_availability_changed', (data) => {
        console.log('[SocketContext] rider_availability_changed received:', data);
        // This event is emitted when riders go online/offline or change status
        // The BodabodaPage component will listen for this and refresh nearby riders
      });

      newSocket.on('ride:location_update', (location) => {
        // Handle rider location update
      });

      newSocket.on('ride_completed', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('ride_declined', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('ride_awaiting_confirmation', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('ride_completed_confirmed', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('payment_released', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('booking:created', async () => {
        await fetchUnreadCount();
      });

      newSocket.on('booking:confirmed', async () => {
        await fetchUnreadCount();
      });

      setSocket(newSocket);

      fetchNotifications();
      fetchUnreadCount();

      const handleUnload = () => {
        console.log('[SocketContext] Handling beforeunload, closing socket');
        newSocket.close();
      };
      window.addEventListener('beforeunload', handleUnload);

      return () => {
        window.removeEventListener('beforeunload', handleUnload);
        newSocket.close();
      };
    } else {
      setSocket(null);
      setIsConnected(false);
    }
  }, [token, user, fetchNotifications, fetchUnreadCount]);

  // Join a room
  const joinRoom = useCallback((room) => {
    if (socket) {
      socket.emit('join_room', room);
    }
  }, [socket]);

  // Leave a room
  const leaveRoom = useCallback((room) => {
    if (socket) {
      socket.emit('leave_room', room);
    }
  }, [socket]);

  // Send a message
  const sendMessage = useCallback((data) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  }, [socket]);

  // Mark notifications as read - refresh from backend
  const markNotificationsRead = useCallback(async (ids) => {
    try {
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error refreshing notification count:', error);
    }
  }, [fetchUnreadCount]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Check if user is online
  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers]
  );

  const value = {
    socket,
    isConnected,
    onlineUsers,
    notifications,
    unreadCount,
    joinRoom,
    leaveRoom,
    sendMessage,
    markNotificationsRead,
    clearNotifications,
    isUserOnline,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};