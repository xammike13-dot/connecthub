import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import mpesaService from '../services/mpesaService.js';
import { mpesaCallback, checkPaymentStatus } from '../controllers/paymentController.js';

test('ConnectHub — Marketplace Order Notification Idempotency Tests', async (t) => {
  console.log('[TEST] Starting MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('[TEST] Connecting to MongoDB...');
  await connectDB();

  // Create test entities
  const customerId = new mongoose.Types.ObjectId();
  const businessId = new mongoose.Types.ObjectId();

  let customerUser, businessUser;

  // Set up mock mpesa checkSTKStatus
  const originalCheckSTKStatus = mpesaService.checkSTKStatus;
  mpesaService.checkSTKStatus = async () => ({
    success: true,
    data: {
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      mpesaReceiptNumber: 'NLK81HG245',
    },
  });

  t.after(async () => {
    mpesaService.checkSTKStatus = originalCheckSTKStatus;
    console.log('[TEST] Disconnecting from database...');
    await mongoose.disconnect();
    console.log('[TEST] Stopping MongoMemoryServer...');
    await mongoServer.stop();
  });

  t.beforeEach(async () => {
    console.log('[TEST] Clearing databases for new test scenario...');
    await User.deleteMany({});
    await Order.deleteMany({});
    await Transaction.deleteMany({});
    await Notification.deleteMany({});

    // Seed customer and business
    customerUser = await User.create({
      _id: customerId,
      name: 'John Customer',
      email: 'john@example.com',
      password: 'password123',
      phone: '254712345678',
      role: 'customer',
    });

    businessUser = await User.create({
      _id: businessId,
      name: 'Alice Business',
      email: 'alice@example.com',
      password: 'password123',
      phone: '254787654321',
      role: 'business',
    });
  });

  const getValidTransactionPayload = (ref, checkoutId) => ({
    transactionRef: ref,
    mpesaReceiptNumber: checkoutId,
    checkoutRequestID: checkoutId,
    type: 'order',
    customer: customerId,
    provider: businessId,
    status: 'pending',
    relatedEntityType: 'order',
    amount: {
      baseAmount: 1000,
      deliveryFee: 50,
      platformFee: 50,
      customerShare: 25,
      providerShare: 25,
      customerPays: 1050,
      providerReceives: 950,
      platformReceives: 100,
      totalAmount: 1050,
    },
    commission: {
      totalCommission: 100,
      customerShare: 25,
      providerShare: 25,
      providerReceives: 950,
    },
    customerPaid: 1050,
    providerReceives: 950,
    pendingEntityData: {
      entityType: 'cart',
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          name: 'Test Product',
          quantity: 1,
          price: 1000,
        },
      ],
      deliveryAddress: {
        phone: '254712345678',
        address: 'Main Street 123',
      },
      deliveryFee: 50,
      businessId: businessId,
      paymentBreakdown: {
        baseAmount: 1000,
        totalAmount: 1050,
        platformFee: 100,
      },
    },
  });

  await t.test('Test 1 — Normal single payment creates exactly 1 order and 1 business notification', async () => {
    // 1. Create a pending checkout transaction
    const transaction = await Transaction.create(getValidTransactionPayload('TXN-NORM-001', 'ws_CO_normal_001'));

    // 2. Mock callback payload (successful pay)
    const req = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: 'MR-normal-001',
            CheckoutRequestID: 'ws_CO_normal_001',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1050.0 },
                { Name: 'MpesaReceiptNumber', Value: 'NLK81HG245' },
                { Name: 'TransactionDate', Value: 20250101120000 },
                { Name: 'PhoneNumber', Value: 254712345678 },
              ],
            },
          },
        },
      },
      app: {
        get: (key) => {
          if (key === 'io') return {
            to: () => ({ emit: () => {} })
          };
          return null;
        },
      },
    };

    const res = {
      status: () => ({ json: () => {} }),
    };

    // Invoke the callback handler
    await mpesaCallback(req, res);

    // Verify exactly 1 order exists
    const orders = await Order.find({ customer: customerId });
    assert.strictEqual(orders.length, 1, 'Exactly 1 order should be created');

    // Verify exactly 1 notification exists for business (type: 'new_order')
    const businessNotifs = await Notification.find({ user: businessId, type: 'new_order' });
    assert.strictEqual(businessNotifs.length, 1, 'Exactly 1 new_order notification should be sent to the business');
  });

  await t.test('Test 2 — Duplicate callback retry results in exactly 1 order and 1 business notification', async () => {
    // 1. Create a pending checkout transaction
    const transaction = await Transaction.create(getValidTransactionPayload('TXN-DUP-001', 'ws_CO_dup_001'));

    // Mock callback request
    const req = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: 'MR-dup-001',
            CheckoutRequestID: 'ws_CO_dup_001',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1050.0 },
                { Name: 'MpesaReceiptNumber', Value: 'NLK81HG245' },
              ],
            },
          },
        },
      },
      app: {
        get: () => ({ to: () => ({ emit: () => {} }) }),
      },
    };

    const res = { status: () => ({ json: () => {} }) };

    // Invoke callback the first time
    await mpesaCallback(req, res);

    // Invoke the same callback a second time
    await mpesaCallback(req, res);

    // Verify only 1 order exists
    const orders = await Order.find({ customer: customerId });
    assert.strictEqual(orders.length, 1, 'Duplicate callback must not create duplicate orders');

    // Verify only 1 business notification exists
    const businessNotifs = await Notification.find({ user: businessId, type: 'new_order' });
    assert.strictEqual(businessNotifs.length, 1, 'Duplicate callback must not create duplicate business notifications');
  });

  await t.test('Test 3 — Simultaneous callback + polling results in exactly 1 order and 1 business notification', async () => {
    // 1. Create a pending checkout transaction
    const transaction = await Transaction.create(getValidTransactionPayload('TXN-SIM-001', 'ws_CO_sim_001'));

    const mockSocketEmissions = {
      newOrder: 0,
      paymentConfirmed: 0
    };

    // Mock callback and polling requests with socket tracking
    const reqCallback = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: 'MR-sim-001',
            CheckoutRequestID: 'ws_CO_sim_001',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: { Item: [{ Name: 'Amount', Value: 1050.0 }, { Name: 'MpesaReceiptNumber', Value: 'NLK81HG245' }] },
          },
        },
      },
      app: {
        get: (key) => {
          if (key === 'io') return {
            to: () => ({
              emit: (event) => {
                if (event === 'new_order') mockSocketEmissions.newOrder++;
                if (event === 'payment_confirmed') mockSocketEmissions.paymentConfirmed++;
              }
            })
          };
          return null;
        },
      },
    };

    const reqPolling = {
      params: { transactionRef: 'TXN-SIM-001' },
      app: {
        get: (key) => {
          if (key === 'io') return {
            to: () => ({
              emit: (event) => {
                if (event === 'new_order') mockSocketEmissions.newOrder++;
                if (event === 'payment_confirmed') mockSocketEmissions.paymentConfirmed++;
              }
            })
          };
          return null;
        },
      },
    };

    const res = { status: () => ({ json: () => {} }) };

    // Trigger both simultaneously (simulated via Promise.all)
    await Promise.all([
      mpesaCallback(reqCallback, res),
      checkPaymentStatus(reqPolling, res),
    ]);

    // Verify only 1 order exists
    const orders = await Order.find({ customer: customerId });
    assert.strictEqual(orders.length, 1, 'Simultaneous callback + polling must not duplicate orders');

    // Verify only 1 business notification exists
    const businessNotifs = await Notification.find({ user: businessId, type: 'new_order' });
    assert.strictEqual(businessNotifs.length, 1, 'Simultaneous callback + polling must not duplicate business notifications');

    // Verify socket emissions occurred exactly once
    assert.strictEqual(mockSocketEmissions.newOrder, 1, 'Socket new_order must only be emitted exactly once');
  });

  await t.test('Test 4 — Multiple payment status polling requests result in exactly 1 order and 1 business notification', async () => {
    // 1. Create a pending checkout transaction
    const transaction = await Transaction.create(getValidTransactionPayload('TXN-POLL-001', 'ws_CO_poll_001'));

    const reqPolling = {
      params: { transactionRef: 'TXN-POLL-001' },
      app: {
        get: () => ({ to: () => ({ emit: () => {} }) }),
      },
    };

    const res = { status: () => ({ json: () => {} }) };

    // Invoke polling 5 times in a row
    for (let i = 0; i < 5; i++) {
      await checkPaymentStatus(reqPolling, res);
    }

    // Verify only 1 order exists
    const orders = await Order.find({ customer: customerId });
    assert.strictEqual(orders.length, 1, 'Multiple polling requests must not duplicate orders');

    // Verify only 1 business notification exists
    const businessNotifs = await Notification.find({ user: businessId, type: 'new_order' });
    assert.strictEqual(businessNotifs.length, 1, 'Multiple polling requests must not duplicate business notifications');
  });
});
