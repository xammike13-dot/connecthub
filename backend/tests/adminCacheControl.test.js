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

test('Admin Cache Control End-To-End Integration Test', async (t) => {
  let mongoServer;
  let child;

  try {
    // 1. Start Mongo Memory Server
    console.log('[Test] Starting MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
      }
    });
    const mongoUri = mongoServer.getUri();
    console.log('[Test] MongoMemoryServer running at:', mongoUri);

    // 2. Seed an admin user
    console.log('[Test] Connecting to MongoDB and seeding admin user...');
    process.env.MONGODB_URI = mongoUri;
    await connectDB();

    const adminEmail = 'connecthubadmin_cache@gmail.com';
    const adminPassword = 'Password123!';

    // Ensure we clear existing user
    await User.deleteMany({ email: adminEmail });

    const adminUser = await User.create({
      name: 'ConnectHub Cache Admin',
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
    console.log('[Test] Admin user seeded successfully:', adminUser.email);
    await mongoose.disconnect();

    // 3. Start Express Server
    const testPort = 5555;
    console.log(`[Test] Spawning backend server on port ${testPort}...`);

    // Set environment variables for child process
    const env = {
      ...process.env,
      PORT: testPort,
      MONGODB_URI: mongoUri,
      NODE_ENV: 'test',
      // Mock MPesa variables to prevent warning/error
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

    // Wait for server to start (we'll listen to its stdout or wait 4 seconds)
    await new Promise((resolve, reject) => {
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

      child.stderr.on('data', (data) => {
        console.error('[Server Err]', data.toString());
      });
    });

    // 4. Authenticate to get Admin JWT Token
    console.log('[Test] Attempting login to get token...');
    const loginRes = await axios.post(`http://localhost:${testPort}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });

    assert.equal(loginRes.status, 200);
    const token = loginRes.data.token;
    assert.ok(token, 'JWT token should be returned');
    console.log('[Test] Logged in successfully. Token obtained.');

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 5. Test GET /api/admin/users Cache-Control headers
    await t.test('GET /api/admin/users returns HTTP 200 and no-cache headers', async () => {
      console.log('[Test] Fetching admin users...');
      const usersRes = await axios.get(`http://localhost:${testPort}/api/admin/users`, { headers });

      assert.equal(usersRes.status, 200);
      assert.equal(usersRes.data.success, true);
      assert.ok(Array.isArray(usersRes.data.data), 'Should return list of users');

      // Check for Cache-Control headers
      const resHeaders = usersRes.headers;
      assert.equal(resHeaders['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
      assert.equal(resHeaders['pragma'], 'no-cache');
      assert.equal(resHeaders['expires'], '0');
      console.log('[Test] GET /api/admin/users verified successfully.');
    });

    // 6. Test GET /api/admin/dashboard/stats Cache-Control headers
    await t.test('GET /api/admin/dashboard/stats returns HTTP 200 and no-cache headers', async () => {
      console.log('[Test] Fetching admin stats...');
      const statsRes = await axios.get(`http://localhost:${testPort}/api/admin/dashboard/stats`, { headers });

      assert.equal(statsRes.status, 200);
      assert.equal(statsRes.data.success, true);
      assert.ok(statsRes.data.data, 'Should return stats object');

      // Check for Cache-Control headers
      const resHeaders = statsRes.headers;
      assert.equal(resHeaders['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
      assert.equal(resHeaders['pragma'], 'no-cache');
      assert.equal(resHeaders['expires'], '0');
      console.log('[Test] GET /api/admin/dashboard/stats verified successfully.');
    });

  } finally {
    // 7. Cleanup
    console.log('[Test] Cleaning up processes and servers...');
    if (child) {
      child.kill('SIGKILL');
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    // Small delay to ensure port release
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
