import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { cleanupOldNotifications } from './controllers/notificationController.js';
import { startRentReminderJob } from './jobs/rentReminderJob.js';

// Fix __dirname for ES modules - MUST be before dotenv.config()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - use absolute path
const envPath = path.resolve(__dirname, '.env');
console.log('[Server] Loading .env from:', envPath);
console.log('[Server] .env exists:', fs.existsSync(envPath));
dotenv.config({ path: envPath });

// Debug: Log environment variables
console.log('[Server] CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
console.log('[Server] CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
console.log('[Server] CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');

// WhatsApp Webhook Verification Token validation - warn if missing
const whatsappVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
if (!whatsappVerifyToken) {
  console.warn('');
  console.warn('═══════════════════════════════════════════════════════════');
  console.warn('  WARNING: WhatsApp Webhook Configuration');
  console.warn('═══════════════════════════════════════════════════════════');
  console.warn('');
  console.warn('  WHATSAPP_VERIFY_TOKEN is not configured.');
  console.warn('  WhatsApp webhook verification will be disabled.');
  console.warn('');
  console.warn('  To enable WhatsApp webhooks, add to backend/.env:');
  console.warn('    WHATSAPP_VERIFY_TOKEN=your_secure_verify_token');
  console.warn('');
  console.warn('═══════════════════════════════════════════════════════════');
  console.warn('');
} else {
  console.log('');
  console.log('═══════════════════════════════════════════════════���═══════');
  console.log('  WhatsApp Webhook Verification Token Loaded');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('[Server] WHATSAPP_VERIFY_TOKEN: LOADED ✓');
  console.log('[Server] Webhook endpoint: GET/POST /api/notifications/webhook');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

// MPesa Daraja API validation - fail fast if missing required config
const requiredMpesaVars = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
];

const missingMpesaVars = requiredMpesaVars.filter(v => !process.env[v] || process.env[v].startsWith('your_'));
if (missingMpesaVars.length > 0) {
  console.error('');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('  FATAL: Missing required MPesa Daraja configuration');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('');
  console.error('  The following environment variables must be set in backend/.env:');
  missingMpesaVars.forEach(v => console.error(`    - ${v}`));
  console.error('');
  console.error('  These are required for M-Pesa STK Push payments.');
  console.error('  Please configure your Daraja API credentials.');
  console.error('');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('');
  // Don't exit - allow server to run for non-payment features
  console.warn('[Server] MPesa payments will be disabled. Set all MPESA_* variables to enable.');
} else {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MPesa Daraja API Configuration Loaded');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('[Server] MPESA_CONSUMER_KEY:', process.env.MPESA_CONSUMER_KEY ? 'LOADED ✓' : 'MISSING ✗');
  console.log('[Server] MPESA_CONSUMER_SECRET:', process.env.MPESA_CONSUMER_SECRET ? 'LOADED ✓' : 'MISSING ✗');
  console.log('[Server] MPESA_SHORTCODE:', process.env.MPESA_SHORTCODE || 'MISSING');
  console.log('[Server] MPESA_PASSKEY:', process.env.MPESA_PASSKEY ? 'LOADED ✓' : 'MISSING ✗');
  console.log('[Server] MPESA_CALLBACK_URL:', process.env.MPESA_CALLBACK_URL || 'DEFAULT');
  console.log('[Server] MPESA_ENVIRONMENT:', process.env.MPESA_ENVIRONMENT || 'sandbox');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

import connectDB from './config/db.js';
import errorHandler from './middleware/error.js';

import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/uploadRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import rentalRoutes from './routes/rentalRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import * as landlordRoutesModule from './routes/landlordRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import riderProfileRoutes from './routes/riderProfileRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import userRoutes from './routes/userRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import setupRoutes from './routes/setupRoutes.js';
import caretakerRoutes from './routes/caretakerRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';

// Connect Database
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.IO Setup
const getEnvOrigins = (...keys) => {
  const origins = keys.flatMap((key) => {
    const value = process.env[key];
    if (!value) return [];
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  });

  return [...new Set(origins)];
};

const allowedOrigins = getEnvOrigins('FRONTEND_URL', 'CLIENT_URL', 'CORS_ORIGIN');

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  // Dynamically trust loopback origins for testing/development
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return true;
  }

  // Explicitly allow secure production origins
  const secureProductionOrigins = [
    'https://connecthub.website',
    'https://connecthubadmin.vercel.app'
  ];

  if (secureProductionOrigins.includes(origin)) {
    return true;
  }

  return allowedOrigins.includes(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'cache-control',
    'pragma',
    'expires'
  ],
  optionsSuccessStatus: 200,
};

const io = new Server(httpServer, {
  cors: corsOptions,
});

// Make io accessible everywhere
app.set('io', io);

// Socket.IO Events
io.on('connection', (socket) => {
  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('send_message', (data) => {
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('update_location', (data) => {
    socket.broadcast
      .to(`customer_${data.customerId}`)
      .emit('rider_location', data);
  });

  socket.on('ride_status_update', (data) => {
    io.to(`customer_${data.customerId}`).emit('ride_update', data);
  });

  socket.on('ride_awaiting_confirmation', (data) => {
    io.to(`user_${data.customerId}`).emit('ride_awaiting_confirmation', data);
  });

  socket.on('disconnect', () => {
    // Socket disconnected
  });
});

// Security Middleware
app.set('trust proxy', 1);
app.use(helmet());

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(morgan('dev'));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ConnectHub API is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve uploaded files (static)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
// Resolve router from the imported module (support default, named `router`, or module itself)
const resolveRouter = (mod) => {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (mod.default && typeof mod.default === 'function') return mod.default;
  if (mod.router && typeof mod.router === 'function') return mod.router;
  if (mod && typeof mod.use === 'function') return mod; // express Router-like
  return null;
};

const landlordRoutes = resolveRouter(landlordRoutesModule);
if (!landlordRoutes) {
  console.error('Failed to resolve landlordRoutes from module. Module keys:', Object.keys(landlordRoutesModule));
  throw new Error('Invalid landlordRoutes export: expected an Express Router or middleware function');
}

app.use('/api/landlord', landlordRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/rider', riderProfileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caretakers', caretakerRoutes);
app.use('/api/assistants', assistantRoutes);

// Serve frontend static assets in production
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Handle React Router client-side routing fallback - wildcard route for non-API requests
app.get(/^\/(?!api|uploads).*/, (req, res) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Frontend build directory not found. Please run build.',
    });
  }
});

// 404 Route for remaining API requests (or requests matching /api/*)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error Handler
app.use(errorHandler);

// Port
const PORT = Number(process.env.PORT) || 5000;

// Start Server
httpServer.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  );
});

// Start scheduled jobs
startRentReminderJob();

// Scheduled cleanup job - run every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
setInterval(async () => {
  console.log('[SCHEDULED] Running notification cleanup job...');
  await cleanupOldNotifications();
}, CLEANUP_INTERVAL);

// Run initial cleanup after server starts
setTimeout(async () => {
  console.log('[SCHEDULED] Running initial notification cleanup...');
  await cleanupOldNotifications();
}, 5000); // Run 5 seconds after server starts

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  httpServer.close(() => {
    process.exit(1);
  });
});
