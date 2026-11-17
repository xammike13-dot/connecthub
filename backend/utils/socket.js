import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let ioInstance = null;

/**
 * Initialize Socket.IO with HTTP server, CORS, auth middleware and room management
 */
export const initSocket = (httpServer, corsOptions) => {
  ioInstance = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!rawToken) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
      const userId = decoded.id || decoded._id;

      if (!userId) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('[Socket Auth Error]:', err.message);
      return next(new Error(`Authentication error: ${err.message}`));
    }
  });

  // Connection & Room Partitioning
  ioInstance.on('connection', (socket) => {
    const user = socket.user;
    if (user) {
      const userId = user._id.toString();

      // Automatically join user-specific room
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${user.email} (${user.role}) joined room user_${userId}`);

      // Role-specific room partitioning
      if (user.role === 'customer') {
        socket.join(`user_${userId}`);
      } else if (user.role === 'business' || user.role === 'assistant') {
        socket.join(`vendor_${userId}`);
        console.log(`[Socket] Vendor ${user.email} joined room vendor_${userId}`);
      } else if (user.role === 'rider') {
        socket.join(`rider_${userId}`);
        console.log(`[Socket] Rider ${user.email} joined room rider_${userId}`);
      } else if (user.role === 'admin') {
        socket.join('admin_channel');
        console.log(`[Socket] Admin ${user.email} joined room admin_channel`);
      }
    }

    // Manual room join
    socket.on('join_room', (room) => {
      socket.join(room);
    });

    // P2P or room messaging
    socket.on('send_message', (data) => {
      if (data?.room) {
        socket.to(data.room).emit('receive_message', data);
      }
    });

    // Rider location streaming
    socket.on('update_location', (data) => {
      if (data?.customerId) {
        socket.broadcast
          .to(`customer_${data.customerId}`)
          .emit('rider_location', data);
      }
    });

    // Ride status updates
    socket.on('ride_status_update', (data) => {
      if (data?.customerId) {
        ioInstance.to(`customer_${data.customerId}`).emit('ride_update', data);
      }
    });

    socket.on('ride_awaiting_confirmation', (data) => {
      if (data?.customerId) {
        ioInstance.to(`user_${data.customerId}`).emit('ride_awaiting_confirmation', data);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] Socket ${socket.id} (${socket.user?.email || 'guest'}) reason: ${reason}`);
    });
  });

  return ioInstance;
};

/**
 * Get active io instance
 */
export const getIO = () => {
  return ioInstance;
};

export default { initSocket, getIO };
