import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../models/Product.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import { trackProductView } from '../controllers/productController.js';
import { ResponseError } from '../middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Product View Tracking & Duplicate Prevention API Verification', async (t) => {
  console.log('Starting MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('Connecting to MongoDB at:', mongoUri);
  await connectDB();

  // Create Users: Business, Customer 1, Customer 2
  const bizUser = await User.create({
    name: 'Test Business',
    email: 'business@example.com',
    password: 'password123',
    phone: '+254700000001',
    role: 'business',
    businessProfile: {
      businessName: 'Biz Store',
      businessLocation: 'Nairobi',
      businessContact: '+254700000001',
    },
  });

  const customer1 = await User.create({
    name: 'Customer One',
    email: 'customer1@example.com',
    password: 'password123',
    phone: '+254700000002',
    role: 'customer',
  });

  const customer2 = await User.create({
    name: 'Customer Two',
    email: 'customer2@example.com',
    password: 'password123',
    phone: '+254700000003',
    role: 'customer',
  });

  const product = await Product.create({
    name: 'Healthcare Pro Product',
    description: 'Awesome healthcare test product',
    price: 1500,
    category: 'healthcare',
    business: bizUser._id,
    stock: 10,
    images: ['https://via.placeholder.com/150'],
  });

  // Helper to run trackProductView controller
  const runTrackView = (user, productId) => {
    return new Promise((resolve) => {
      const req = {
        params: { productId: productId.toString() },
        user: { _id: user._id, role: user.role },
        app: {
          get: (key) => null // No socket io mocked
        }
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

      trackProductView(req, res, next);
    });
  };

  try {
    await t.test('1. First view by customer increments count & tracks in customerProfile', async () => {
      const { responseStatus, responseJson, errorThrown } = await runTrackView(customer1, product._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');
      assert.equal(responseJson.success, true);
      assert.equal(responseJson.data.views, 1, 'View count should be 1');
      assert.equal(responseJson.data.hasViewed, true, 'hasViewed should be true');

      // Verify DB update on product
      const updatedProduct = await Product.findById(product._id);
      assert.equal(updatedProduct.views, 1, 'Views in DB should be 1');

      // Verify DB update on user viewedProducts
      const updatedUser = await User.findById(customer1._id);
      const viewedList = updatedUser.customerProfile?.viewedProducts || [];
      assert.ok(viewedList.some(id => id.toString() === product._id.toString()), 'Product should be in user\'s viewed list');
    });

    await t.test('2. Second view by the SAME customer does NOT increment view count', async () => {
      const { responseStatus, responseJson, errorThrown } = await runTrackView(customer1, product._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');
      assert.equal(responseJson.data.views, 1, 'View count should remain 1');
      assert.equal(responseJson.data.hasViewed, true, 'hasViewed should be true');

      // Verify DB remains 1
      const updatedProduct = await Product.findById(product._id);
      assert.equal(updatedProduct.views, 1, 'Views in DB should still be 1');
    });

    await t.test('3. View by product owner (business) is ignored & does NOT increment views', async () => {
      const { responseStatus, responseJson, errorThrown } = await runTrackView(bizUser, product._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');

      const updatedProduct = await Product.findById(product._id);
      assert.equal(updatedProduct.views, 1, 'Views in DB should still be 1');
    });

    await t.test('4. View by a different customer increments view count', async () => {
      const { responseStatus, responseJson, errorThrown } = await runTrackView(customer2, product._id);

      assert.equal(errorThrown, null, 'No error should be thrown');
      assert.equal(responseStatus, 200, 'Status should be 200');
      assert.equal(responseJson.data.views, 2, 'View count should now be 2');

      const updatedProduct = await Product.findById(product._id);
      assert.equal(updatedProduct.views, 2, 'Views in DB should be 2');

      const updatedUser = await User.findById(customer2._id);
      const viewedList = updatedUser.customerProfile?.viewedProducts || [];
      assert.ok(viewedList.some(id => id.toString() === product._id.toString()), 'Product should be in customer 2\'s viewed list');
    });

  } finally {
    console.log('Closing database connection...');
    await mongoose.disconnect();
    console.log('Stopping MongoMemoryServer...');
    await mongoServer.stop();
    console.log('Test completed successfully!');
  }
});
