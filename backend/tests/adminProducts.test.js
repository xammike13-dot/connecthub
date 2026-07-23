import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';
import axios from 'axios';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Wishlist from '../models/Wishlist.js';
import SystemLog from '../models/SystemLog.js';
import connectDB from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Admin Products API End-To-End Integration Test', async (t) => {
  let mongoServer;
  let child;

  try {
    // 1. Start Mongo Memory Server
    console.log('[Test] Starting MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27018, // use a different port to avoid conflict
      }
    });
    const mongoUri = mongoServer.getUri();
    console.log('[Test] MongoMemoryServer running at:', mongoUri);

    // 2. Seed data
    console.log('[Test] Connecting to MongoDB and seeding data...');
    process.env.MONGODB_URI = mongoUri;
    await connectDB();

    // Clear collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Wishlist.deleteMany({});
    await SystemLog.deleteMany({});

    // Seed admin user
    const adminEmail = 'connecthubadmin_prod@gmail.com';
    const adminPassword = 'Password123!';
    const adminUser = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      phone: '0711111111',
      role: 'admin',
      emailVerified: true,
      isVerified: true,
      isActive: true,
      accountActive: true,
      setupCompleted: true,
      onboardingCompleted: true,
    });

    // Seed customer user
    const customerUser = await User.create({
      name: 'Customer User',
      email: 'customer@gmail.com',
      password: 'Password123!',
      phone: '0722222222',
      role: 'customer',
      emailVerified: true,
      isVerified: true,
      isActive: true,
      accountActive: true,
      setupCompleted: true,
      onboardingCompleted: true,
    });

    // Seed business user
    const businessUser = await User.create({
      name: 'Business Owner',
      email: 'business@gmail.com',
      password: 'Password123!',
      phone: '0733333333',
      role: 'business',
      emailVerified: true,
      isVerified: true,
      isActive: true,
      accountActive: true,
      setupCompleted: true,
      onboardingCompleted: true,
      businessProfile: {
        businessName: 'Apex Electronics',
        businessDescription: 'Quality hardware and devices',
        businessCategory: 'Electronics',
      }
    });

    // Seed products
    const productActive = await Product.create({
      business: businessUser._id,
      name: 'Wireless Headphones',
      description: 'Superb sound quality bluetooth headphones',
      price: 2500,
      category: 'Electronics',
      images: ['https://example.com/headphones.jpg'],
      stock: 15,
      views: 120,
      isActive: true,
    });

    const productOutOfStock = await Product.create({
      business: businessUser._id,
      name: 'USB-C Cable Fast Charger',
      description: 'High speed durable nylon braided usb-c cable',
      price: 500,
      category: 'Electronics',
      images: ['https://example.com/cable.jpg'],
      stock: 0,
      views: 45,
      isActive: true,
    });

    const productInactive = await Product.create({
      business: businessUser._id,
      name: 'Retro Coffee Maker',
      description: 'Classic design 12-cup retro automatic coffee maker',
      price: 6000,
      category: 'Kitchen',
      images: ['https://example.com/coffee.jpg'],
      stock: 5,
      views: 10,
      isActive: false,
    });

    const productFlagged = await Product.create({
      business: businessUser._id,
      name: 'Suspicious Software Key',
      description: 'Unlicensed counterfeit computer activation key',
      price: 150,
      category: 'Software',
      images: ['https://example.com/key.jpg'],
      stock: 99,
      views: 3,
      isActive: false,
      isFlagged: true,
    });

    // Seed an order referencing the active product
    const order = await Order.create({
      customer: customerUser._id,
      business: businessUser._id,
      orderType: 'marketplace',
      items: [{
        product: productActive._id,
        name: productActive.name,
        quantity: 2,
        price: productActive.price,
        image: productActive.images[0]
      }],
      totalAmount: 5000,
      finalAmount: 5100,
      status: 'completed',
      paymentMethod: 'mpesa',
      paymentStatus: 'paid'
    });

    // Seed a customer wishlist
    const wishlist = await Wishlist.create({
      customer: customerUser._id,
      products: [
        { product: productActive._id, addedAt: new Date() },
        { product: productInactive._id, addedAt: new Date() }
      ]
    });

    console.log('[Test] Seed data populated successfully.');

    // 3. Start Express Server
    const testPort = 5556;
    console.log(`[Test] Spawning backend server on port ${testPort}...`);

    const env = {
      ...process.env,
      PORT: testPort,
      MONGODB_URI: mongoUri,
      NODE_ENV: 'test',
      MPESA_CONSUMER_KEY: 'test_consumer_key',
      MPESA_CONSUMER_SECRET: 'test_consumer_secret',
      MPESA_SHORTCODE: '174379',
      MPESA_PASSKEY: 'test_passkey',
      MPESA_CALLBACK_URL: 'https://test.callback',
      JWT_SECRET: 'test_jwt_secret',
    };

    const serverPath = path.resolve(__dirname, '../server.js');
    child = spawn('node', [serverPath], {
      env,
      stdio: 'pipe',
    });

    // Wait for server to start
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 4000);

      child.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running') || output.includes('running in')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // 4. Authenticate
    console.log('[Test] Logging in to get admin JWT token...');
    const loginRes = await axios.post(`http://localhost:${testPort}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });

    assert.equal(loginRes.status, 200);
    const token = loginRes.data.token;
    assert.ok(token);

    const headers = { Authorization: `Bearer ${token}` };

    // 5. Test GET /api/admin/products/stats
    await t.test('GET /api/admin/products/stats returns correct counts and views', async () => {
      const statsRes = await axios.get(`http://localhost:${testPort}/api/admin/products/stats`, { headers });
      assert.equal(statsRes.status, 200);
      assert.equal(statsRes.data.success, true);
      const stats = statsRes.data.data;

      assert.equal(stats.totalProducts, 4);
      assert.equal(stats.activeProducts, 1); // Wireless Headphones is the only active + stock > 0 + not flagged
      assert.equal(stats.inactiveProducts, 1); // Retro Coffee Maker is inactive, isFlagged false
      assert.equal(stats.outOfStockProducts, 1); // USB-C Cable is active, stock 0, isFlagged false
      assert.equal(stats.flaggedProducts, 1); // Suspicious Key is flagged
      assert.equal(stats.totalViews, 120 + 45 + 10 + 3);
      assert.equal(stats.totalOrders, 1);
    });

    // 6. Test GET /api/admin/products
    await t.test('GET /api/admin/products returns matching products with paginated search', async () => {
      // No filters
      const resAll = await axios.get(`http://localhost:${testPort}/api/admin/products`, { headers });
      assert.equal(resAll.status, 200);
      assert.equal(resAll.data.success, true);
      assert.equal(resAll.data.data.length, 4);

      // Verify ordersCount aggregation
      const headProduct = resAll.data.data.find(p => p.name === 'Wireless Headphones');
      assert.ok(headProduct);
      assert.equal(headProduct.ordersCount, 1);
      assert.equal(headProduct.business.businessName, 'Apex Electronics');

      // Category filter
      const resKitchen = await axios.get(`http://localhost:${testPort}/api/admin/products?category=Kitchen`, { headers });
      assert.equal(resKitchen.data.data.length, 1);
      assert.equal(resKitchen.data.data[0].name, 'Retro Coffee Maker');

      // Status active filter
      const resActive = await axios.get(`http://localhost:${testPort}/api/admin/products?status=active`, { headers });
      assert.equal(resActive.data.data.length, 1);
      assert.equal(resActive.data.data[0].name, 'Wireless Headphones');

      // Status flagged filter
      const resFlagged = await axios.get(`http://localhost:${testPort}/api/admin/products?status=flagged`, { headers });
      assert.equal(resFlagged.data.data.length, 1);
      assert.equal(resFlagged.data.data[0].name, 'Suspicious Software Key');

      // Search filter
      const resSearch = await axios.get(`http://localhost:${testPort}/api/admin/products?search=wireless`, { headers });
      assert.equal(resSearch.data.data.length, 1);
      assert.equal(resSearch.data.data[0].name, 'Wireless Headphones');
    });

    // 7. Test GET /api/admin/products/:id
    await t.test('GET /api/admin/products/:id returns detailed product and business info', async () => {
      const resDetail = await axios.get(`http://localhost:${testPort}/api/admin/products/${productActive._id}`, { headers });
      assert.equal(resDetail.status, 200);
      assert.equal(resDetail.data.success, true);
      const prod = resDetail.data.data;
      assert.equal(prod.name, 'Wireless Headphones');
      assert.equal(prod.ordersCount, 1);
      assert.equal(prod.business.businessName, 'Apex Electronics');
      assert.equal(prod.business.email, 'business@gmail.com');
    });

    // 8. Test PATCH /api/admin/products/:id/status
    await t.test('PATCH /api/admin/products/:id/status suspends and activates products', async () => {
      try {
        // Suspend
        const resSuspend = await axios.patch(`http://localhost:${testPort}/api/admin/products/${productActive._id}/status`, {
          isActive: false
        }, { headers });
        assert.equal(resSuspend.status, 200);
        assert.equal(resSuspend.data.data.isActive, false);

        // Verify log was created
        const logs = await mongoose.model('SystemLog').find({ 'details.category': 'product_management' });
        assert.ok(logs.length > 0);
        assert.ok(logs[0].message.includes('suspended'));

        // Reactivate
        const resActivate = await axios.patch(`http://localhost:${testPort}/api/admin/products/${productActive._id}/status`, {
          isActive: true
        }, { headers });
        assert.equal(resActivate.status, 200);
        assert.equal(resActivate.data.data.isActive, true);
      } catch (err) {
        if (err.response) {
          console.error('[Error Response status]', err.response.status);
          console.error('[Error Response data]', JSON.stringify(err.response.data));
        }
        throw err;
      }
    });

    // 9. Test PATCH /api/admin/products/:id/flag
    await t.test('PATCH /api/admin/products/:id/flag flags/unflags product', async () => {
      // Flag as suspicious
      const resFlag = await axios.patch(`http://localhost:${testPort}/api/admin/products/${productActive._id}/flag`, {
        isFlagged: true
      }, { headers });
      assert.equal(resFlag.status, 200);
      assert.equal(resFlag.data.data.isFlagged, true);
      assert.equal(resFlag.data.data.isActive, false); // Flagging suspends it

      // Unflag product
      const resUnflag = await axios.patch(`http://localhost:${testPort}/api/admin/products/${productActive._id}/flag`, {
        isFlagged: false
      }, { headers });
      assert.equal(resUnflag.status, 200);
      assert.equal(resUnflag.data.data.isFlagged, false);
      assert.equal(resUnflag.data.data.isActive, true); // Unflagging activates it
    });

    // 10. Test DELETE /api/admin/products/:id
    await t.test('DELETE /api/admin/products/:id pulls product from wishlists and database', async () => {
      // Delete the inactive product (Retro Coffee Maker)
      const resDelete = await axios.delete(`http://localhost:${testPort}/api/admin/products/${productInactive._id}`, { headers });
      assert.equal(resDelete.status, 200);
      assert.equal(resDelete.data.success, true);

      // Verify deleted in database
      const prodInDb = await mongoose.model('Product').findById(productInactive._id);
      assert.equal(prodInDb, null);

      // Verify pulled from wishlist
      const wishlistInDb = await mongoose.model('Wishlist').findOne({ customer: customerUser._id });
      const hasProduct = wishlistInDb.products.some(p => p.product.toString() === productInactive._id.toString());
      assert.equal(hasProduct, false);
    });

  } finally {
    console.log('[Test] Cleaning up integration test...');
    if (child) {
      child.kill('SIGKILL');
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    await mongoose.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
