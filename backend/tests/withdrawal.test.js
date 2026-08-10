import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Withdrawal from '../models/Withdrawal.js';
import connectDB from '../config/db.js';
import { requestWithdrawal, getWithdrawalHistory } from '../controllers/withdrawalController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Withdrawal and Wallet Feature Suite', async (t) => {
  console.log('Starting MongoMemoryServer for withdrawal tests...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('Connecting to MongoDB...');
  await connectDB();

  // Create a provider user and a wallet
  const providerUser = await User.create({
    name: 'Test Provider',
    email: 'provider@example.com',
    password: 'password123',
    phone: '0712345678',
    role: 'business',
  });

  const wallet = await Wallet.create({
    user: providerUser._id,
    balance: 500, // Available: KES 500
    pendingBalance: 100,
    totalEarnings: 600,
    totalWithdrawn: 0,
  });

  // Helper to execute requestWithdrawal controller
  const runRequestWithdrawal = (userObj, body) => {
    return new Promise((resolve) => {
      const req = {
        user: userObj,
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

      requestWithdrawal(req, res, next);
    });
  };

  try {
    await t.test('1. Reject amount below minimum (KES 100)', async () => {
      const { responseStatus, responseJson, errorThrown } = await runRequestWithdrawal(
        providerUser,
        { amount: 50, phoneNumber: '0712345678' }
      );

      assert.ok(errorThrown, 'Should throw an error');
      assert.equal(errorThrown.statusCode, 400);
      assert.match(errorThrown.message, /Minimum withdrawal amount/);
    });

    await t.test('2. Reject amount greater than available balance', async () => {
      const { responseStatus, responseJson, errorThrown } = await runRequestWithdrawal(
        providerUser,
        { amount: 1000, phoneNumber: '0712345678' }
      );

      assert.ok(errorThrown, 'Should throw an error');
      assert.equal(errorThrown.statusCode, 400);
      assert.match(errorThrown.message, /Insufficient balance/);
    });

    await t.test('3. Reject invalid Kenyan phone numbers', async () => {
      // Test invalid digits
      const res1 = await runRequestWithdrawal(providerUser, { amount: 150, phoneNumber: '12345' });
      assert.ok(res1.errorThrown, 'Should fail for short phone');
      assert.equal(res1.errorThrown.statusCode, 400);
      assert.match(res1.errorThrown.message, /Kenyan phone number/);

      // Test letters
      const res2 = await runRequestWithdrawal(providerUser, { amount: 150, phoneNumber: 'abcdefghijk' });
      assert.ok(res2.errorThrown, 'Should fail for non-numeric phone');
      assert.equal(res2.errorThrown.statusCode, 400);
      assert.match(res2.errorThrown.message, /Kenyan phone number/);
    });

    await t.test('4. Process a valid withdrawal of KES 100', async () => {
      const { responseStatus, responseJson, errorThrown } = await runRequestWithdrawal(
        providerUser,
        { amount: 100, phoneNumber: '0722222222' }
      );

      assert.equal(errorThrown, null, 'No error should be thrown on valid withdrawal');
      assert.equal(responseStatus, 201, 'Status code should be 201');
      assert.equal(responseJson.success, true);
      assert.equal(responseJson.data.amount, 100);
      assert.equal(responseJson.data.netAmount, 99); // 1% fee (KES 1)
      assert.equal(responseJson.data.phoneNumber, '0722222222');
      assert.equal(responseJson.data.status, 'pending');

      // Verify wallet deduction
      const updatedWallet = await Wallet.findOne({ user: providerUser._id });
      assert.equal(updatedWallet.balance, 400, 'Balance should decrease by KES 100');

      // Verify withdrawal record created
      const withdrawalRecord = await Withdrawal.findById(responseJson.data.withdrawalId);
      assert.ok(withdrawalRecord, 'Record should exist in database');
      assert.equal(withdrawalRecord.status, 'pending');
      assert.equal(withdrawalRecord.amount, 100);
    });

    await t.test('5. Lockout duplicate/double submissions within 10s', async () => {
      const { responseStatus, responseJson, errorThrown } = await runRequestWithdrawal(
        providerUser,
        { amount: 100, phoneNumber: '0722222222' }
      );

      assert.ok(errorThrown, 'Should block duplicate requests');
      assert.equal(errorThrown.statusCode, 400);
      assert.match(errorThrown.message, /duplicate withdrawal request/);
    });

  } finally {
    console.log('Cleaning up withdrawal test resources...');
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Withdrawal tests finished.');
  }
});
