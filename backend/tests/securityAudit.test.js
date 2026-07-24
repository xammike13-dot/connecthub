import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import VerificationToken from '../models/VerificationToken.js';
import Transaction from '../models/Transaction.js';

import connectDB from '../config/db.js';
import { nosqlSanitize } from '../middleware/nosqlSanitize.js';
import { getUserById, updateUser } from '../controllers/userController.js';
import { getTransaction } from '../controllers/paymentController.js';
import { verifyEmailCode } from '../controllers/verificationController.js';
import { resetPassword } from '../controllers/authController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('ConnectHub Platform Comprehensive Security Audit Verification', async (t) => {
  let mongoServer;

  try {
    // Setup MongoMemoryServer
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    await connectDB();

    // Seed Helper Data
    let adminUser, customer1, customer2, businessUser, sampleTransaction, sampleToken;

    await t.test('Seed test users and resources', async () => {
      // 1. Create Users
      adminUser = await User.create({
        name: 'Platform Admin',
        email: 'admin@connecthub.test',
        password: 'password123',
        phone: '254700000001',
        role: 'admin',
        emailVerified: true,
        isActive: true,
      });

      customer1 = await User.create({
        name: 'Customer One',
        email: 'customer1@connecthub.test',
        password: 'password123',
        phone: '254700000002',
        role: 'customer',
        emailVerified: true,
        isActive: true,
      });

      customer2 = await User.create({
        name: 'Customer Two',
        email: 'customer2@connecthub.test',
        password: 'password123',
        phone: '254700000003',
        role: 'customer',
        emailVerified: true,
        isActive: true,
      });

      businessUser = await User.create({
        name: 'Business User',
        email: 'business@connecthub.test',
        password: 'password123',
        phone: '254700000004',
        role: 'business',
        emailVerified: true,
        isActive: true,
      });

      // 2. Create Transaction with all required fields of Mongoose Schema
      sampleTransaction = await Transaction.create({
        transactionRef: 'TXN-AUDIT-TEST-123',
        type: 'order',
        customer: customer1._id,
        provider: businessUser._id,
        status: 'paid',
        amount: {
          baseAmount: 1000,
          deliveryFee: 100,
          platformFee: 50,
          customerShare: 10,
          providerShare: 40,
          customerPays: 1100,
          providerReceives: 1050,
          platformReceives: 50,
          totalAmount: 1100,
        },
        commission: {
          totalCommission: 50,
          customerShare: 10,
          providerShare: 40,
          providerReceives: 1050,
        },
        customerPaid: 1100,
        providerReceives: 1050,
        relatedEntityType: 'order',
        relatedEntity: new mongoose.Types.ObjectId(),
      });

      assert.ok(adminUser && customer1 && customer2 && businessUser && sampleTransaction);
    });

    // Test NoSQL Injection protection middleware
    await t.test('NoSQL Injection Sanitization Middleware', async () => {
      const req = {
        body: { email: { $gt: '' }, normalField: 'value' },
        query: { search: { $ne: 'malicious' }, page: '1' },
        params: { id: { $in: ['1', '2'] } },
      };
      const res = {};
      const next = () => {};

      nosqlSanitize(req, res, next);

      // Verify $ fields are recursively deleted, leaving empty objects for sanitized sub-properties
      assert.deepEqual(req.body, { email: {}, normalField: 'value' });
      assert.deepEqual(req.query, { search: {}, page: '1' });
      assert.deepEqual(req.params, { id: {} });
    });

    // Test Profile Authorization and Privilege Escalation Blockades
    await t.test('Profile Authorization & IDOR Blockades', async () => {
      // Test getUserById: Customer 1 fetching their own profile (Allow)
      const runGetProfile = (reqUser, paramId) => {
        return new Promise((resolve, reject) => {
          const req = { user: reqUser, params: { id: paramId } };
          const res = {
            status: (code) => ({
              json: (data) => resolve({ status: code, data }),
            }),
          };
          getUserById(req, res, (err) => {
            if (err) resolve({ status: err.statusCode || 500, error: err.message });
          });
        });
      };

      let result = await runGetProfile(customer1, customer1._id.toString());
      assert.equal(result.status, 200);

      // Customer 1 fetching Customer 2's profile (Deny with 403)
      result = await runGetProfile(customer1, customer2._id.toString());
      assert.equal(result.status, 403);

      // Admin fetching Customer 2's profile (Allow)
      result = await runGetProfile(adminUser, customer2._id.toString());
      assert.equal(result.status, 200);

      // Test updateUser: Customer 1 trying to update own profile and escalate role to admin
      const runUpdateProfile = (reqUser, paramId, updates) => {
        return new Promise((resolve) => {
          const req = { user: reqUser, params: { id: paramId }, body: updates };
          const res = {
            status: (code) => ({
              json: (data) => resolve({ status: code, data }),
            }),
          };
          updateUser(req, res, (err) => {
            if (err) resolve({ status: err.statusCode || 500, error: err.message });
          });
        });
      };

      // Customer 1 updating their own name (Allow)
      result = await runUpdateProfile(customer1, customer1._id.toString(), { name: 'Customer One Updated' });
      assert.equal(result.status, 200);

      // Customer 1 attempting role escalation to admin (Should strip 'role' and keep customer)
      result = await runUpdateProfile(customer1, customer1._id.toString(), { role: 'admin', emailVerified: false });
      assert.equal(result.status, 200);

      const freshCustomer1 = await User.findById(customer1._id);
      assert.equal(freshCustomer1.role, 'customer'); // Role remains customer

      // Customer 1 trying to update Customer 2's profile (Deny with 403)
      result = await runUpdateProfile(customer1, customer2._id.toString(), { name: 'Hacker' });
      assert.equal(result.status, 403);
    });

    // Test Transaction Details Security (IDOR block on payments)
    await t.test('Transaction Details Security and IDOR Protection', async () => {
      const runGetTransaction = (reqUser, transactionRef) => {
        return new Promise((resolve) => {
          const req = { user: reqUser, params: { transactionRef } };
          const res = {
            status: (code) => ({
              json: (data) => resolve({ status: code, data }),
            }),
          };
          getTransaction(req, res, (err) => {
            if (err) resolve({ status: err.statusCode || 500, error: err.message });
          });
        });
      };

      // Customer 1 (participant) can view details (Allow)
      let result = await runGetTransaction(customer1, sampleTransaction.transactionRef);
      assert.equal(result.status, 200);
      assert.equal(result.data.success, true);
      assert.equal(result.data.data.darajaResponse, undefined); // Sensitive data deselected

      // Customer 2 (non-participant) cannot view details (Deny with 403)
      result = await runGetTransaction(customer2, sampleTransaction.transactionRef);
      assert.equal(result.status, 403);

      // Admin can view details (Allow)
      result = await runGetTransaction(adminUser, sampleTransaction.transactionRef);
      assert.equal(result.status, 200);
    });

    // Test OTP Brute-Force Rate Limiting for Email Verification
    await t.test('OTP Brute-Force Rate Limiting: Email Verification', async () => {
      // Setup unverified user & token
      const unverifiedUser = await User.create({
        name: 'Unverified User',
        email: 'unverified@connecthub.test',
        password: 'password123',
        phone: '254700000005',
        role: 'customer',
        emailVerified: false,
        isActive: false,
      });

      sampleToken = await VerificationToken.create({
        userId: unverifiedUser._id,
        type: 'email',
        token: '123456',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const runVerifyEmail = (email, code) => {
        return new Promise((resolve) => {
          const req = { body: { email, code }, headers: {}, connection: {} };
          const res = {
            status: (code) => ({
              json: (data) => resolve({ status: code, data }),
            }),
          };
          verifyEmailCode(req, res);
        });
      };

      // 1-4. Submit incorrect OTP code four times
      for (let i = 1; i <= 4; i++) {
        const result = await runVerifyEmail(unverifiedUser.email, 'wrongcode');
        assert.equal(result.status, 400);
        assert.equal(result.data.success, false);
      }

      // Check attempts count in database
      let freshUser = await User.findById(unverifiedUser._id);
      assert.equal(freshUser.emailVerificationAttempts, 4);

      // 5. Submit incorrect OTP code for the 5th time -> lockout
      const lockResult = await runVerifyEmail(unverifiedUser.email, 'wrongcode');
      assert.equal(lockResult.status, 403);
      assert.ok(lockResult.data.message.includes('locked') || lockResult.data.message.includes('attempts'));

      // Invalidated tokens check
      const tokens = await VerificationToken.find({ userId: unverifiedUser._id, type: 'email', used: false });
      assert.equal(tokens.length, 0); // Token deleted on lockout

      // Try to verify with correct code now -> Denied due to active lockout
      const finalResult = await runVerifyEmail(unverifiedUser.email, '123456');
      assert.equal(finalResult.status, 403);
      assert.ok(finalResult.data.message.includes('attempts') || finalResult.data.message.includes('try again'));
    });

    // Test OTP Brute-Force Rate Limiting for Password Reset
    await t.test('OTP Brute-Force Rate Limiting: Password Reset', async () => {
      const sampleResetToken = await VerificationToken.create({
        userId: customer1._id,
        type: 'password_reset',
        token: '654321',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const runResetPassword = (email, code, newPassword) => {
        return new Promise((resolve) => {
          const req = { body: { email, code, newPassword } };
          const res = {
            status: (code) => ({
              json: (data) => resolve({ status: code, data }),
            }),
          };
          resetPassword(req, res);
        });
      };

      // Submit incorrect reset code four times
      for (let i = 1; i <= 4; i++) {
        const result = await runResetPassword(customer1.email, 'wrongcode', 'newpassword123');
        assert.equal(result.status, 400);
      }

      let freshUser = await User.findById(customer1._id);
      assert.equal(freshUser.passwordResetAttempts, 4);

      // 5. Submit 5th wrong code -> Lockout
      const lockResult = await runResetPassword(customer1.email, 'wrongcode', 'newpassword123');
      assert.equal(lockResult.status, 403);

      // Tokens cleared
      const tokens = await VerificationToken.find({ userId: customer1._id, type: 'password_reset', used: false });
      assert.equal(tokens.length, 0);
    });

  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});
