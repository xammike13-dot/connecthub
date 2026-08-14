import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';
import axios from 'axios';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Admin User Account Management Actions Integration Test', async (t) => {
  let mongoServer;
  let child;

  try {
    // 1. Start Mongo Memory Server
    console.log('[Test] Starting MongoMemoryServer for User Account Management...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27019, // use a different port to avoid conflicts
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

    // Seed admin user
    const adminEmail = 'connecthubadmin_test@gmail.com';
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

    // Seed non-admin customer user (for authorization tests)
    const customerEmail = 'customer_test@gmail.com';
    const customerPassword = 'Password123!';
    const customerUser = await User.create({
      name: 'Customer User',
      email: customerEmail,
      password: customerPassword,
      phone: '0722222222',
      role: 'customer',
      emailVerified: true,
      isVerified: true,
      isActive: true,
      accountActive: true,
      setupCompleted: true,
      onboardingCompleted: true,
    });

    // Seed candidate users for each account-management combination
    // 1. Candidate: Active + Email Verified
    const candidateActiveVerified = await User.create({
      name: 'Active Verified User',
      email: 'candidate1@gmail.com',
      password: 'Password123!',
      phone: '0700000001',
      role: 'customer',
      emailVerified: true,
      isVerified: true,
      isActive: true,
    });

    // 2. Candidate: Active + Email Not Verified
    const candidateActiveUnverified = await User.create({
      name: 'Active Unverified User',
      email: 'candidate2@gmail.com',
      password: 'Password123!',
      phone: '0700000002',
      role: 'customer',
      emailVerified: false,
      isVerified: false,
      isActive: true,
    });

    // 3. Candidate: Suspended + Email Not Verified
    const candidateSuspendedUnverified = await User.create({
      name: 'Suspended Unverified User',
      email: 'candidate3@gmail.com',
      password: 'Password123!',
      phone: '0700000003',
      role: 'customer',
      emailVerified: false,
      isVerified: false,
      isActive: false,
    });

    // 4. Candidate: Suspended + Email Verified
    const candidateSuspendedVerified = await User.create({
      name: 'Suspended Verified User',
      email: 'candidate4@gmail.com',
      password: 'Password123!',
      phone: '0700000004',
      role: 'customer',
      emailVerified: true,
      isVerified: true,
      isActive: false,
    });

    console.log('[Test] Seed data populated successfully.');

    // 3. Start Express Server
    const testPort = 5557;
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

    // 4. Authenticate Admin and Customer
    console.log('[Test] Logging in to get JWT tokens...');
    const adminLoginRes = await axios.post(`http://localhost:${testPort}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });
    assert.equal(adminLoginRes.status, 200);
    const adminToken = adminLoginRes.data.token;
    assert.ok(adminToken);

    const customerLoginRes = await axios.post(`http://localhost:${testPort}/api/auth/login`, {
      email: customerEmail,
      password: customerPassword,
    });
    assert.equal(customerLoginRes.status, 200);
    const customerToken = customerLoginRes.data.token;
    assert.ok(customerToken);

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const customerHeaders = { Authorization: `Bearer ${customerToken}` };

    // 5. Test Authorization protection
    await t.test('Admin authorization guards protect user account management actions', async () => {
      // Non-admin should be rejected on status updates
      await assert.rejects(
        axios.put(`http://localhost:${testPort}/api/admin/users/${candidateActiveVerified._id}/status`, {
          isActive: false
        }, { headers: customerHeaders }),
        (err) => {
          assert.equal(err.response.status, 403);
          assert.equal(err.response.data.success, false);
          return true;
        }
      );

      // Non-admin should be rejected on email verification
      await assert.rejects(
        axios.put(`http://localhost:${testPort}/api/admin/users/${candidateActiveUnverified._id}/verify-email`, {}, { headers: customerHeaders }),
        (err) => {
          assert.equal(err.response.status, 403);
          assert.equal(err.response.data.success, false);
          return true;
        }
      );

      // Non-admin should be rejected on deletion
      await assert.rejects(
        axios.delete(`http://localhost:${testPort}/api/admin/users/${candidateActiveVerified._id}`, { headers: customerHeaders }),
        (err) => {
          assert.equal(err.response.status, 403);
          assert.equal(err.response.data.success, false);
          return true;
        }
      );
    });

    // 6. Test SUSPEND account
    await t.test('Admin can suspend an active account', async () => {
      const res = await axios.put(`http://localhost:${testPort}/api/admin/users/${candidateActiveVerified._id}/status`, {
        isActive: false
      }, { headers: adminHeaders });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.isActive, false);

      // Verify in DB
      const userInDb = await User.findById(candidateActiveVerified._id);
      assert.equal(userInDb.isActive, false);
    });

    // 7. Test ACTIVATE account
    await t.test('Admin can activate a suspended account', async () => {
      const res = await axios.put(`http://localhost:${testPort}/api/admin/users/${candidateSuspendedVerified._id}/status`, {
        isActive: true
      }, { headers: adminHeaders });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.isActive, true);

      // Verify in DB
      const userInDb = await User.findById(candidateSuspendedVerified._id);
      assert.equal(userInDb.isActive, true);
    });

    // 8. Test MANUALLY VERIFY email
    await t.test('Admin can manually verify an unverified email', async () => {
      const res = await axios.put(`http://localhost:${testPort}/api/admin/users/${candidateActiveUnverified._id}/verify-email`, {}, { headers: adminHeaders });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.emailVerified, true);

      // Verify in DB
      const userInDb = await User.findById(candidateActiveUnverified._id);
      assert.equal(userInDb.emailVerified, true);
      assert.equal(userInDb.isVerified, true);
    });

    // 9. Test DELETE account
    await t.test('Admin can delete an account (soft deletion)', async () => {
      const res = await axios.delete(`http://localhost:${testPort}/api/admin/users/${candidateActiveVerified._id}`, { headers: adminHeaders });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);

      // Verify in DB
      const userInDb = await User.findById(candidateActiveVerified._id);
      assert.equal(userInDb.isDeleted, true);
      assert.equal(userInDb.isActive, false);
      assert.ok(userInDb.email.includes('_deleted_'));
      assert.ok(userInDb.phone.includes('_deleted_'));
    });

  } finally {
    console.log('[Test] Cleaning up User Account Management integration test...');
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
