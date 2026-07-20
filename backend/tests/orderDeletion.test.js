import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Order from '../models/Order.js';
import connectDB from '../config/db.js';
import { deleteOrder } from '../controllers/orderController.js';
import { ResponseError } from '../middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Order Deletion API security and logic verification', async (t) => {
  console.log('Starting MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('Connecting to MongoDB at:', mongoUri);
  await connectDB();

  // Define some user IDs with roles
  const cust1 = { _id: new mongoose.Types.ObjectId(), role: 'customer' };
  const cust2 = { _id: new mongoose.Types.ObjectId(), role: 'customer' };
  const biz1 = { _id: new mongoose.Types.ObjectId(), role: 'business' };
  const biz2 = { _id: new mongoose.Types.ObjectId(), role: 'business' };
  const rider1 = { _id: new mongoose.Types.ObjectId(), role: 'rider' };

  try {
    // Clean up collections
    await Order.deleteMany({});

    // Helper to create order payloads
    const createTestOrder = async (customer, business, status, orderType = 'marketplace') => {
      return await Order.create({
        customer: customer._id,
        business: business._id,
        orderType,
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            name: 'Test Product',
            quantity: 1,
            price: 100
          }
        ],
        totalAmount: 100,
        finalAmount: 100,
        status,
        paymentMethod: 'mpesa',
        paymentStatus: 'pending',
      });
    };

    // Helper to run deleteOrder controller
    const runDelete = (user, orderId) => {
      return new Promise((resolve) => {
        const req = {
          params: { orderId: orderId.toString() },
          user: { _id: user._id, role: user.role }
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
              }
            };
          }
        };

        const next = (err) => {
          if (err) errorThrown = err;
          resolve({ responseStatus, responseJson, errorThrown });
        };

        // Trigger the controller (which runs asynchronously)
        deleteOrder(req, res, next);
      });
    };

    // Test cases

    await t.test('1. Customer can delete their own completed order', async () => {
      const order = await createTestOrder(cust1, biz1, 'completed');

      const { responseStatus, responseJson, errorThrown } = await runDelete(cust1, order._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');
      assert.equal(responseJson.success, true, 'Response success should be true');

      // Verify actually removed from MongoDB
      const found = await Order.findById(order._id);
      assert.equal(found, null, 'Order should be deleted from DB');
    });

    await t.test('2. Customer can delete their own cancelled order', async () => {
      const order = await createTestOrder(cust1, biz1, 'cancelled');

      const { responseStatus, responseJson, errorThrown } = await runDelete(cust1, order._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');
      assert.equal(responseJson.success, true, 'Response success should be true');

      // Verify actually removed from MongoDB
      const found = await Order.findById(order._id);
      assert.equal(found, null, 'Order should be deleted from DB');
    });

    await t.test('3. Customer CANNOT delete an active order (e.g. pending)', async () => {
      const order = await createTestOrder(cust1, biz1, 'pending');

      const { responseStatus, errorThrown } = await runDelete(cust1, order._id);

      assert.ok(errorThrown instanceof ResponseError, 'Should throw a ResponseError');
      assert.equal(errorThrown.statusCode, 400, 'Status code should be 400');
      assert.match(errorThrown.message, /Can only delete completed or cancelled orders/, 'Message should specify restrictions');

      // Verify NOT deleted from MongoDB
      const found = await Order.findById(order._id);
      assert.ok(found, 'Order should still exist in DB');
    });

    await t.test('4. Customer CANNOT delete another customer\'s order', async () => {
      const order = await createTestOrder(cust1, biz1, 'completed');

      const { responseStatus, errorThrown } = await runDelete(cust2, order._id);

      assert.ok(errorThrown instanceof ResponseError, 'Should throw a ResponseError');
      assert.equal(errorThrown.statusCode, 403, 'Status code should be 403');
      assert.match(errorThrown.message, /Not authorized/, 'Message should specify authorization failure');

      // Verify NOT deleted from MongoDB
      const found = await Order.findById(order._id);
      assert.ok(found, 'Order should still exist in DB');
    });

    await t.test('5. Business can delete their own completed order', async () => {
      const order = await createTestOrder(cust1, biz1, 'completed');

      const { responseStatus, responseJson, errorThrown } = await runDelete(biz1, order._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');
      assert.equal(responseJson.success, true, 'Response success should be true');

      // Verify actually removed from MongoDB
      const found = await Order.findById(order._id);
      assert.equal(found, null, 'Order should be deleted from DB');
    });

    await t.test('6. Business CANNOT delete another business\'s order', async () => {
      const order = await createTestOrder(cust1, biz1, 'completed');

      const { responseStatus, errorThrown } = await runDelete(biz2, order._id);

      assert.ok(errorThrown instanceof ResponseError, 'Should throw a ResponseError');
      assert.equal(errorThrown.statusCode, 403, 'Status code should be 403');
      assert.match(errorThrown.message, /Not authorized/, 'Message should specify authorization failure');

      // Verify NOT deleted from MongoDB
      const found = await Order.findById(order._id);
      assert.ok(found, 'Order should still exist in DB');
    });

    await t.test('7. Riders/other roles CANNOT delete any orders', async () => {
      const order = await createTestOrder(cust1, biz1, 'completed');

      const { responseStatus, errorThrown } = await runDelete(rider1, order._id);

      assert.ok(errorThrown instanceof ResponseError, 'Should throw a ResponseError');
      assert.equal(errorThrown.statusCode, 403, 'Status code should be 403');
      assert.match(errorThrown.message, /Not authorized/, 'Message should specify authorization failure');

      // Verify NOT deleted from MongoDB
      const found = await Order.findById(order._id);
      assert.ok(found, 'Order should still exist in DB');
    });

  } finally {
    console.log('Closing database connection...');
    await mongoose.disconnect();
    console.log('Stopping MongoMemoryServer...');
    await mongoServer.stop();
    console.log('Test completed successfully!');
  }
});
