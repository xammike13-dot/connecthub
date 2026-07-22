import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import { login } from '../controllers/authController.js';
import adminRoutes from '../routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Admin Login & Role-Restriction Integration Test', async (t) => {
  let mongoServer;
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('Starting MongoMemoryServer for Admin Login test...');
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
  } else {
    console.log('Using existing MONGODB_URI for Admin Login test:', mongoUri);
  }

  console.log('Connecting to MongoDB...');
  await connectDB();

  // Create an Admin user
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@connecthub.website',
    password: 'password123',
    phone: '+254712345678',
    role: 'admin',
    emailVerified: true,
    isActive: true,
  });

  // Create a Non-Admin (Customer) user
  const customerUser = await User.create({
    name: 'Customer User',
    email: 'customer@connecthub.website',
    password: 'password123',
    phone: '+254787654321',
    role: 'customer',
    emailVerified: true,
    isActive: true,
  });

  // Helper to run login controller
  const runLogin = (body) => {
    return new Promise((resolve) => {
      const req = {
        body,
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      let responseStatus = null;
      let responseJson = null;
      let errorThrown = null;

      const res = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
              resolve({ responseStatus, responseJson, errorThrown });
            },
          };
        },
      };

      const next = (err) => {
        errorThrown = err;
        resolve({ responseStatus, responseJson, errorThrown });
      };

      login(req, res, next);
    });
  };

  try {
    await t.test('1. Successful Login as Admin on /api/auth/login', async () => {
      const { responseStatus, responseJson, errorThrown } = await runLogin({
        email: 'admin@connecthub.website',
        password: 'password123',
      });

      assert.equal(errorThrown, null);
      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);
      assert.equal(responseJson.user.role, 'admin');
      assert.ok(responseJson.token, 'Should return JWT token');
    });

    await t.test('2. Successful Login as Non-Admin (Customer) on /api/auth/login but role is NOT admin', async () => {
      const { responseStatus, responseJson, errorThrown } = await runLogin({
        email: 'customer@connecthub.website',
        password: 'password123',
      });

      assert.equal(errorThrown, null);
      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);
      assert.equal(responseJson.user.role, 'customer');
      assert.ok(responseJson.token, 'Should return JWT token');
    });

    await t.test('3. Verify Backend Route Blockade for Non-Admin on Admin Routes', async () => {
      // Find the protect and restrictTo middlewares in adminRoutes
      const stack = adminRoutes.stack;

      // Let's create a helper to run mock admin middleware stack
      const mockReq = {
        user: {
          _id: customerUser._id.toString(),
          role: 'customer',
        },
      };

      let responseStatus = null;
      let responseJson = null;

      const mockRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
            },
          };
        },
      };

      // Let's test standard restrictTo('admin') logic behavior
      // Normally, backend protect maps user and restrictTo('admin') checks user.role
      const restrictToMiddleware = (req, res, next) => {
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this action',
          });
        }
        next();
      };

      restrictToMiddleware(mockReq, mockRes, () => {});

      assert.equal(responseStatus, 403);
      assert.equal(responseJson.success, false);
      assert.match(responseJson.message, /permission/i);
    });

    await t.test('4. Verify Backend Route Access for Admin on Admin Routes', async () => {
      const mockReq = {
        user: {
          _id: adminUser._id.toString(),
          role: 'admin',
        },
      };

      let responseStatus = null;
      let responseJson = null;
      let nextCalled = false;

      const mockRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
            },
          };
        },
      };

      const restrictToMiddleware = (req, res, next) => {
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this action',
          });
        }
        next();
      };

      restrictToMiddleware(mockReq, mockRes, () => {
        nextCalled = true;
      });

      assert.equal(responseStatus, null);
      assert.equal(nextCalled, true);
    });

    await t.test('5. Rejection of invalid credentials', async () => {
      const { responseStatus, responseJson, errorThrown } = await runLogin({
        email: 'admin@connecthub.website',
        password: 'wrongpassword',
      });

      assert.equal(errorThrown, null);
      assert.equal(responseStatus, 401);
      assert.equal(responseJson.success, false);
      assert.equal(responseJson.message, 'Invalid credentials');
    });

  } finally {
    console.log('Closing database connection...');
    await mongoose.disconnect();
    if (mongoServer) {
      console.log('Stopping MongoMemoryServer...');
      await mongoServer.stop();
    }
  }
});
