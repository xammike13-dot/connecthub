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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Exact Admin User Login Verification', async (t) => {
  let mongoServer;
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
  }

  await connectDB();

  // Create the exact requested admin credentials user
  const adminEmail = 'connecthub387@gmail.com';
  const adminPassword = 'Mike3870@';

  await User.deleteMany({ email: adminEmail });

  const adminUser = await User.create({
    name: 'ConnectHub Admin',
    email: adminEmail,
    password: adminPassword,
    phone: '0794603837',
    role: 'admin',
    emailVerified: true,
    isVerified: true,
    isActive: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
  });

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
    await t.test('Successful Admin login with correct email and password', async () => {
      const { responseStatus, responseJson, errorThrown } = await runLogin({
        email: adminEmail,
        password: adminPassword,
      });

      assert.equal(errorThrown, null);
      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);
      assert.equal(responseJson.user.email, adminEmail);
      assert.equal(responseJson.user.role, 'admin');
      assert.ok(responseJson.token, 'Should return jwt token');
    });
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});
