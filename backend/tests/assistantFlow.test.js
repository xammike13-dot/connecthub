import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import AssistantInvitation from '../models/AssistantInvitation.js';
import connectDB from '../config/db.js';
import {
  registerAssistantAndAccept,
  acceptInvitationExisting,
  getInvitationDetails,
  generateInvitation,
  getActiveBusinessId
} from '../controllers/assistantController.js';
import { login } from '../controllers/authController.js';
import withdrawalRoutes from '../routes/withdrawalRoutes.js';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Business Assistant Invitation, Registration, and Login Integration Test', async (t) => {
  console.log('Starting MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('Connecting to MongoDB at:', mongoUri);
  await connectDB();

  // Create a business owner
  const businessOwner = await User.create({
    name: 'Business Owner',
    email: 'owner@example.com',
    password: 'password123',
    phone: '+254711111111',
    role: 'business',
    businessProfile: {
      businessName: 'Apex Store',
      businessLocation: 'Nairobi',
      businessContact: '+254711111111',
    },
  });

  // Let's manually create an invitation token for the tests
  const inviteToken = 'test-token-12345';
  await AssistantInvitation.create({
    business: businessOwner._id,
    token: inviteToken,
    assistantName: 'Jane Assistant',
    assistantPhone: '+254722222222',
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const inviteTokenExisting = 'test-token-existing';
  await AssistantInvitation.create({
    business: businessOwner._id,
    token: inviteTokenExisting,
    assistantName: 'Existing User',
    assistantPhone: '+254733333333',
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Helper to run registerAssistantAndAccept controller
  const runRegister = (token, body) => {
    return new Promise((resolve) => {
      const req = {
        params: { token },
        body,
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

      registerAssistantAndAccept(req, res, next);
    });
  };

  // Helper to run acceptInvitationExisting controller
  const runAcceptExisting = (token, userObj) => {
    return new Promise((resolve) => {
      const req = {
        params: { token },
        user: userObj,
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

      acceptInvitationExisting(req, res, next);
    });
  };

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
    await t.test('1. Registration from invitation link', async () => {
      const body = {
        name: 'Jane Assistant',
        email: 'jane@example.com',
        phone: '+254722222222',
        password: 'password123',
      };

      const { responseStatus, responseJson, errorThrown } = await runRegister(inviteToken, body);

      if (errorThrown) {
        console.error('Registration failed with error:', errorThrown);
      } else {
        console.log('Registration succeeded. Response was:', responseStatus, responseJson);
      }

      assert.equal(errorThrown, null, 'No error should be thrown on registration');
      assert.equal(responseStatus, 201, 'Status code should be 201');
      assert.equal(responseJson.success, true);
      assert.ok(responseJson.token, 'A JWT token should be returned');

      // Verify user was created in DB
      const user = await User.findOne({ email: 'jane@example.com' }).select('+password');
      assert.ok(user, 'User should exist in database');
      assert.equal(user.role, 'assistant');
      assert.equal(user.emailVerified, true);
      assert.equal(user.isActive, true);
      assert.equal(user.setupCompleted, true);
      assert.equal(user.onboardingCompleted, true);
      assert.equal(user.assistantProfile.business.toString(), businessOwner._id.toString());
      assert.equal(user.assistantProfile.status, 'active');

      // Verify invitation was accepted
      const updatedInvitation = await AssistantInvitation.findOne({ token: inviteToken });
      assert.equal(updatedInvitation.status, 'accepted');
      assert.equal(updatedInvitation.assistant.toString(), user._id.toString());
    });

    await t.test('2. Login with registered assistant credentials', async () => {
      const body = {
        email: 'jane@example.com',
        password: 'password123',
      };

      const { responseStatus, responseJson, errorThrown } = await runLogin(body);

      if (errorThrown) {
        console.error('Login failed with error:', errorThrown);
      } else {
        console.log('Login succeeded. Response was:', responseStatus, responseJson);
      }

      assert.equal(errorThrown, null, 'No error should be thrown on login');
      assert.equal(responseStatus, 200, 'Status code should be 200');
      assert.equal(responseJson.success, true);
      assert.ok(responseJson.token, 'Should return jwt token on login');
    });

    await t.test('3. Accept invitation with existing user', async () => {
      // Create existing user (customer)
      const existingUser = await User.create({
        name: 'Existing Customer',
        email: 'existing@example.com',
        password: 'password123',
        phone: '+254733333333',
        role: 'customer',
        emailVerified: true,
        isActive: true,
      });

      // Login first to verify password works before acceptance
      const { responseStatus: lStatus, responseJson: lJson } = await runLogin({
        email: 'existing@example.com',
        password: 'password123',
      });
      assert.equal(lStatus, 200);

      // Now accept invitation
      const { responseStatus: aStatus, responseJson: aJson, errorThrown: aErr } = await runAcceptExisting(inviteTokenExisting, existingUser);

      assert.equal(aErr, null);
      assert.equal(aStatus, 200);
      assert.equal(aJson.success, true);

      // Now attempt to log in again with same password
      const { responseStatus: lStatus2, responseJson: lJson2, errorThrown: lErr2 } = await runLogin({
        email: 'existing@example.com',
        password: 'password123',
      });

      if (lErr2 || lStatus2 !== 200) {
        console.error('Login after acceptance failed with status:', lStatus2, lJson2);
      }
      assert.equal(lStatus2, 200, 'Password should still work after accepting invitation!');
    });

    await t.test('4. Block assistant from financial/withdrawal routes', async () => {
      // Setup mock request and response with assistant user
      const mockReq = {
        user: {
          _id: '64a7c29e92bc443f5505dc25',
          role: 'assistant',
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

      // Find all express middlewares in withdrawalRoutes
      const stack = withdrawalRoutes.stack;
      const middlewares = stack.filter(layer => layer.handle && layer.handle.length === 3);

      // Locate the one that blocks assistants (our custom middleware is index 1)
      const middleware = middlewares.find(layer => layer.handle.toString().includes('assistant'));

      assert.ok(middleware, 'Should have registered blocking middleware');

      // Call the middleware directly
      middleware.handle(mockReq, mockRes, () => {});

      assert.equal(responseStatus, 403, 'Middleware should return 403 Forbidden for assistant');
      assert.equal(responseJson.success, false);
      assert.ok(responseJson.message.includes('not authorized'), 'Message should indicate lack of authorization');
    });

  } finally {
    console.log('Closing database connection...');
    await mongoose.disconnect();
    console.log('Stopping MongoMemoryServer...');
    await mongoServer.stop();
  }
});
