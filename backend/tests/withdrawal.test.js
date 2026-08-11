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
import mpesaService from '../services/mpesaService.js';
import {
  requestWithdrawal,
  getWithdrawalHistory,
  mpesaB2CCallback,
  mpesaB2CTimeout,
} from '../controllers/withdrawalController.js';

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

  // Mock env variables for B2C Safaricom API to make sure tests bypass validation checks or mock correctly
  process.env.MPESA_B2C_SECURITY_CREDENTIAL = 'mocked_security_credential';
  process.env.MPESA_B2C_INITIATOR_NAME = 'testapi';
  process.env.MPESA_B2C_SHORTCODE = '174379';
  process.env.MPESA_CONSUMER_KEY = 'mocked_consumer_key';
  process.env.MPESA_CONSUMER_SECRET = 'mocked_consumer_secret';

  // Stub the mpesaService.getAccessToken and initiateB2C methods to bypass live HTTP requests during test
  const originalGetAccessToken = mpesaService.getAccessToken;
  mpesaService.getAccessToken = async () => 'mocked_access_token';

  const originalInitiateB2C = mpesaService.initiateB2C;
  mpesaService.initiateB2C = async (b2cData) => {
    return {
      success: true,
      data: {
        ResponseCode: '0',
        ResponseDescription: 'Accept the service request successfully.',
        ConversationID: 'AG_20250101_0000417fed8ed666e976',
        OriginatorConversationID: b2cData.originatorConversationId,
      },
      message: 'B2C payout request initiated successfully',
    };
  };

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

    await t.test('6. Handle successful B2C webhook callback', async () => {
      // Create a pending withdrawal record with originatorConversationId
      const testOriginatorId = 'B2C-SUCCESS-TEST';
      const testConvId = 'CONV-SUCCESS-TEST';

      // Set wallet balance for this test
      const testWallet = await Wallet.findOne({ user: providerUser._id });
      testWallet.balance = 500;
      testWallet.pendingBalance = 200;
      await testWallet.save();

      const withdrawalSuccess = await Withdrawal.create({
        user: providerUser._id,
        wallet: testWallet._id,
        amount: 200,
        fee: 2,
        netAmount: 198,
        status: 'pending',
        mpesaPhoneNumber: '0722222222',
        requestedBy: providerUser._id,
        originatorConversationId: testOriginatorId,
        conversationId: testConvId,
      });

      // Prepare mocked webhook req/res objects
      const callbackReq = {
        body: {
          Result: {
            OriginatorConversationID: testOriginatorId,
            ConversationID: testConvId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            ResultParameters: {
              ResultParameter: [
                { Key: 'TransactionReceipt', Value: 'NLK81HG245' }
              ]
            }
          }
        }
      };

      let responseStatus = null;
      let responseJson = null;

      const callbackRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
            }
          };
        }
      };

      await mpesaB2CCallback(callbackReq, callbackRes);

      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);

      // Verify the withdrawal record in DB is updated to completed
      const updatedWithdrawal = await Withdrawal.findById(withdrawalSuccess._id);
      assert.equal(updatedWithdrawal.status, 'completed');
      assert.equal(updatedWithdrawal.mpesaReceiptNumber, 'NLK81HG245');

      // Verify wallet balances: pendingBalance should decrease by 200 (to 0) and totalWithdrawn should increase by 200
      const updatedWallet = await Wallet.findById(testWallet._id);
      assert.equal(updatedWallet.pendingBalance, 0);
      assert.equal(updatedWallet.totalWithdrawn, 200);
      assert.equal(updatedWallet.balance, 500, 'Available balance should remain unchanged on success');
    });

    await t.test('7. Handle failed B2C webhook callback', async () => {
      // Create a pending withdrawal record
      const testOriginatorId = 'B2C-FAILURE-TEST';
      const testConvId = 'CONV-FAILURE-TEST';

      const testWallet = await Wallet.findOne({ user: providerUser._id });
      testWallet.balance = 300;
      testWallet.pendingBalance = 200;
      await testWallet.save();

      const withdrawalFailure = await Withdrawal.create({
        user: providerUser._id,
        wallet: testWallet._id,
        amount: 200,
        fee: 2,
        netAmount: 198,
        status: 'pending',
        mpesaPhoneNumber: '0722222222',
        requestedBy: providerUser._id,
        originatorConversationId: testOriginatorId,
        conversationId: testConvId,
      });

      // Prepare mocked webhook req/res objects for a failed callback (ResultCode !== 0)
      const callbackReq = {
        body: {
          Result: {
            OriginatorConversationID: testOriginatorId,
            ConversationID: testConvId,
            ResultCode: 2029,
            ResultDesc: 'System Error occurred'
          }
        }
      };

      let responseStatus = null;
      let responseJson = null;

      const callbackRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
            }
          };
        }
      };

      await mpesaB2CCallback(callbackReq, callbackRes);

      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);

      // Verify the withdrawal record in DB is updated to failed
      const updatedWithdrawal = await Withdrawal.findById(withdrawalFailure._id);
      assert.equal(updatedWithdrawal.status, 'failed');
      assert.equal(updatedWithdrawal.rejectionReason, 'System Error occurred');

      // Verify wallet balances: pendingBalance decreases by 200, and available balance is restored (refunded) by 200 (to 500)
      const updatedWallet = await Wallet.findById(testWallet._id);
      assert.equal(updatedWallet.pendingBalance, 0);
      assert.equal(updatedWallet.balance, 500);
    });

    await t.test('8. Handle B2C webhook timeout callback', async () => {
      const testOriginatorId = 'B2C-TIMEOUT-TEST';
      const testConvId = 'CONV-TIMEOUT-TEST';

      const testWallet = await Wallet.findOne({ user: providerUser._id });
      testWallet.balance = 300;
      testWallet.pendingBalance = 200;
      await testWallet.save();

      const withdrawalTimeout = await Withdrawal.create({
        user: providerUser._id,
        wallet: testWallet._id,
        amount: 200,
        fee: 2,
        netAmount: 198,
        status: 'pending',
        mpesaPhoneNumber: '0722222222',
        requestedBy: providerUser._id,
        originatorConversationId: testOriginatorId,
        conversationId: testConvId,
      });

      const timeoutReq = {
        body: {
          OriginatorConversationID: testOriginatorId,
          ConversationID: testConvId,
        }
      };

      let responseStatus = null;
      let responseJson = null;

      const timeoutRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
            }
          };
        }
      };

      await mpesaB2CTimeout(timeoutReq, timeoutRes);

      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);

      const updatedWithdrawal = await Withdrawal.findById(withdrawalTimeout._id);
      assert.equal(updatedWithdrawal.status, 'pending_reconciliation');
      assert.equal(updatedWithdrawal.rejectionReason, 'Safaricom B2C request timed out in queue');

      const updatedWallet = await Wallet.findById(testWallet._id);
      assert.equal(updatedWallet.pendingBalance, 200, 'Funds should remain locked in pendingBalance on timeout');
      assert.equal(updatedWallet.balance, 300, 'Available balance should remain unchanged on timeout');
    });

    await t.test('9. Reject duplicate callback requests (already completed/failed)', async () => {
      const testOriginatorId = 'B2C-DUP-TEST';
      const testConvId = 'CONV-DUP-TEST';

      const testWallet = await Wallet.findOne({ user: providerUser._id });
      testWallet.balance = 300;
      testWallet.pendingBalance = 200;
      await testWallet.save();

      const withdrawalDup = await Withdrawal.create({
        user: providerUser._id,
        wallet: testWallet._id,
        amount: 200,
        fee: 2,
        netAmount: 198,
        status: 'completed', // already completed!
        mpesaPhoneNumber: '0722222222',
        requestedBy: providerUser._id,
        originatorConversationId: testOriginatorId,
        conversationId: testConvId,
      });

      const callbackReq = {
        body: {
          Result: {
            OriginatorConversationID: testOriginatorId,
            ConversationID: testConvId,
            ResultCode: 0,
            ResultDesc: 'Some subsequent callback'
          }
        }
      };

      let responseStatus = null;
      let responseJson = null;

      const callbackRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseJson = data;
            }
          };
        }
      };

      await mpesaB2CCallback(callbackReq, callbackRes);

      // Should return 200 with "Already processed"
      assert.equal(responseStatus, 200);
      assert.equal(responseJson.success, true);
      assert.equal(responseJson.message, 'Already processed');

      // Wallet should remain unchanged because it was already completed/failed and early returned
      const finalWallet = await Wallet.findById(testWallet._id);
      assert.equal(finalWallet.balance, 300);
      assert.equal(finalWallet.pendingBalance, 200);
    });

    await t.test('10. Verify wallet rollback on missing B2C security credential / payout initiation failure', async () => {
      // Clear any pending/duplicate withdrawals for this user to avoid triggering the 10-second duplicate lockout
      await Withdrawal.deleteMany({ user: providerUser._id });

      // Temporarily remove security credential env
      const origCred = process.env.MPESA_B2C_SECURITY_CREDENTIAL;
      delete process.env.MPESA_B2C_SECURITY_CREDENTIAL;

      // Restore original initiateB2C temporarily to test real code validation
      const stubbedInitiateB2C = mpesaService.initiateB2C;
      mpesaService.initiateB2C = originalInitiateB2C;

      const testWallet = await Wallet.findOne({ user: providerUser._id });
      testWallet.balance = 200;
      testWallet.pendingBalance = 0;
      await testWallet.save();

      const { responseStatus, responseJson, errorThrown } = await runRequestWithdrawal(
        providerUser,
        { amount: 150, phoneNumber: '0722222222' }
      );

      // Should fail at initiation stage
      assert.ok(errorThrown, 'Should fail because of missing MPESA_B2C_SECURITY_CREDENTIAL');
      assert.match(errorThrown.message, /MPESA_B2C_SECURITY_CREDENTIAL/);

      // Check wallet rollback: balance must be back to 200 and pending balance must be 0
      const rolledBackWallet = await Wallet.findOne({ user: providerUser._id });
      assert.equal(rolledBackWallet.balance, 200, 'Wallet balance should be fully restored on initiation failure');
      assert.equal(rolledBackWallet.pendingBalance, 0, 'Wallet pendingBalance should be reset to 0');

      // Verify that the withdrawal record created was marked failed
      const withdrawalRecord = await Withdrawal.findOne({ user: providerUser._id }).sort({ createdAt: -1 });
      assert.equal(withdrawalRecord.status, 'failed', 'Withdrawal record status should be set to failed');
      assert.match(withdrawalRecord.rejectionReason, /MPESA_B2C_SECURITY_CREDENTIAL/);

      // Restore original stub and credentials
      mpesaService.initiateB2C = stubbedInitiateB2C;
      process.env.MPESA_B2C_SECURITY_CREDENTIAL = origCred;
    });

  } finally {
    console.log('Cleaning up withdrawal test resources...');
    // Restore original mpesaService stubs
    mpesaService.getAccessToken = originalGetAccessToken;
    mpesaService.initiateB2C = originalInitiateB2C;

    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Withdrawal tests finished.');
  }
});
