import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import SystemLog from '../models/SystemLog.js';
import SupportTicket from '../models/SupportTicket.js';
import { getPlatformHealth } from '../controllers/adminController.js';

describe('Admin Monitoring & SystemLog Integration Tests', () => {
  let mongoServer;
  let dummyUser;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create a dummy user for validation checks
    dummyUser = await User.create({
      name: 'Test User',
      email: 'testuser@connecthub.website',
      phone: '254700000000',
      password: 'password123',
      role: 'customer',
      emailVerified: true
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('1. SystemLog schema successfully writes and queries logs', async () => {
    const log = await SystemLog.create({
      type: 'payment_failure',
      message: 'M-Pesa STK Push Timeout',
      details: { checkoutRequestID: 'ws_CO_22072026_111122' },
      statusCode: 400
    });

    assert.ok(log._id);
    assert.strictEqual(log.type, 'payment_failure');
    assert.strictEqual(log.message, 'M-Pesa STK Push Timeout');
    assert.strictEqual(log.statusCode, 400);

    const fetched = await SystemLog.findOne({ _id: log._id });
    assert.strictEqual(fetched.message, 'M-Pesa STK Push Timeout');
  });

  test('2. getPlatformHealth correctly queries counts, logs, and database status', async () => {
    // Clear logs
    await SystemLog.deleteMany({});
    await SupportTicket.deleteMany({});

    // Seed dummy entries
    await SystemLog.create({
      type: 'payment_failure',
      message: 'Failed to process callback',
    });

    await SystemLog.create({
      type: 'api_error',
      message: 'Resource not found',
      statusCode: 404
    });

    await SupportTicket.create({
      user: dummyUser._id,
      category: 'payment',
      title: 'Double Charge',
      description: 'Charged twice for order',
      status: 'Open'
    });

    // Mock Express request/response objects
    const req = {};
    let responseStatus = null;
    let responseData = null;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    // Execute platform health controller directly
    await getPlatformHealth(req, res);

    assert.strictEqual(responseStatus, 200);
    assert.ok(responseData.success);

    const stats = responseData.data;
    assert.strictEqual(stats.databaseStatus, 'connected');
    assert.strictEqual(stats.failedPayments, 1);
    assert.strictEqual(stats.failedApiRequests, 1);
    assert.strictEqual(stats.pendingSupport, 1);
    assert.ok(stats.recentErrors.length >= 2);
    assert.strictEqual(stats.recentErrors[0].message, 'Resource not found');
  });
});
