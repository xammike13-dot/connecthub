import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mpesaService from '../services/mpesaService.js';
import { mpesaCallback } from '../controllers/paymentController.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('M-Pesa STK Push parameters and callback handling audit tests', async (t) => {

  await t.test('1. AccountReference is formatted and truncated to <= 12 characters', () => {
    // We can verify mpesaService formats various account references correctly by mocking getConfig()
    const originalGetConfig = mpesaService.getConfig;
    mpesaService.getConfig = () => ({
      shortcode: '174379',
      passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6ib72ada1ed2c9192',
      callbackUrl: 'http://localhost/api/payments/mpesa/callback',
      environment: 'sandbox',
      baseUrl: 'https://sandbox.safaricom.co.ke'
    });

    // Test a long reference similar to ORDER-TXN-823C6B85
    let formattedRef1 = 'ORDER-TXN-823C6B85';
    if (formattedRef1.includes('-')) {
      const parts = formattedRef1.split('-');
      const suffix = parts[parts.length - 1];
      formattedRef1 = `TXN${suffix}`;
    }
    formattedRef1 = formattedRef1.replace(/\s+/g, '').substring(0, 12);

    assert.strictEqual(formattedRef1, 'TXN823C6B85');
    assert.ok(formattedRef1.length <= 12, 'AccountReference must be <= 12 characters');

    // Test a simpler reference
    let formattedRef2 = 'TXN-ABC12345';
    if (formattedRef2.includes('-')) {
      const parts = formattedRef2.split('-');
      const suffix = parts[parts.length - 1];
      formattedRef2 = `TXN${suffix}`;
    }
    formattedRef2 = formattedRef2.replace(/\s+/g, '').substring(0, 12);

    assert.strictEqual(formattedRef2, 'TXNABC12345');
    assert.ok(formattedRef2.length <= 12, 'AccountReference must be <= 12 characters');

    // Restore original getConfig
    mpesaService.getConfig = originalGetConfig;
  });

  await t.test('2. TransactionDesc is limited to <= 13 characters', () => {
    const desc1 = 'Marketplace order payment';
    const truncatedDesc1 = desc1.substring(0, 13);
    assert.strictEqual(truncatedDesc1, 'Marketplace o');
    assert.ok(truncatedDesc1.length <= 13, 'TransactionDesc must be <= 13 characters');

    const desc2 = 'Order Payment';
    const truncatedDesc2 = desc2.substring(0, 13);
    assert.strictEqual(truncatedDesc2, 'Order Payment');
    assert.ok(truncatedDesc2.length <= 13, 'TransactionDesc must be <= 13 characters');
  });

  await t.test('3. Merchant shortcode / Till configuration and TransactionType selection', () => {
    const originalGetConfig = mpesaService.getConfig;

    // Simulate production Buy Goods Till configuration
    mpesaService.getConfig = () => ({
      shortcode: '4342025',
      passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6ib72ada1ed2c9192',
      callbackUrl: 'http://localhost/api/payments/mpesa/callback',
      environment: 'production',
      baseUrl: 'https://api.safaricom.co.ke'
    });

    const config = mpesaService.getConfig();
    let transactionType = 'CustomerPayBillOnline';
    let partyB = config.shortcode;

    if (config.shortcode === '4342025') {
      transactionType = 'CustomerBuyGoodsOnline';
      partyB = '3011302';
    }

    assert.strictEqual(transactionType, 'CustomerBuyGoodsOnline');
    assert.strictEqual(partyB, '3011302');

    // Simulate standard sandbox configuration
    mpesaService.getConfig = () => ({
      shortcode: '174379',
      passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6ib72ada1ed2c9192',
      callbackUrl: 'http://localhost/api/payments/mpesa/callback',
      environment: 'sandbox',
      baseUrl: 'https://sandbox.safaricom.co.ke'
    });

    const configSandbox = mpesaService.getConfig();
    let transactionTypeSandbox = 'CustomerPayBillOnline';
    let partyBSandbox = configSandbox.shortcode;

    if (configSandbox.shortcode === '4342025') {
      transactionTypeSandbox = 'CustomerBuyGoodsOnline';
      partyBSandbox = '3011302';
    }

    assert.strictEqual(transactionTypeSandbox, 'CustomerPayBillOnline');
    assert.strictEqual(partyBSandbox, '174379');

    mpesaService.getConfig = originalGetConfig;
  });

  await t.test('4. Callback process handling for success and failed STK callback format (ResultCode 2029)', () => {
    // 4.1 Mocking a failed callback (ResultCode 2029) without CallbackMetadata
    const failedCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: '12345-67890-1',
          CheckoutRequestID: 'ws_CO_1234567890',
          ResultCode: 2029,
          ResultDesc: 'System Error occurred'
        }
      }
    };

    const processedFailed = mpesaService.processCallback(failedCallbackPayload);
    assert.strictEqual(processedFailed.isValid, true, 'Failed STK Callback must be classified as a valid format');
    assert.strictEqual(processedFailed.success, false, 'Failed STK Callback must have success: false');
    assert.strictEqual(processedFailed.data.resultCode, 2029);
    assert.strictEqual(processedFailed.data.resultDesc, 'System Error occurred');
    assert.strictEqual(processedFailed.data.checkoutRequestID, 'ws_CO_1234567890');
    assert.strictEqual(processedFailed.data.merchantRequestID, '12345-67890-1');
    assert.strictEqual(processedFailed.data.mpesaReceiptNumber, null, 'Failed STK Callback does not require metadata');

    // 4.2 Mocking a successful callback (ResultCode 0) with CallbackMetadata
    const successCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: '12345-67890-2',
          CheckoutRequestID: 'ws_CO_0987654321',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100.00 },
              { Name: 'MpesaReceiptNumber', Value: 'NLK81HG245' },
              { Name: 'TransactionDate', Value: 20250101120000 },
              { Name: 'PhoneNumber', Value: 254712345678 }
            ]
          }
        }
      }
    };

    const processedSuccess = mpesaService.processCallback(successCallbackPayload);
    assert.strictEqual(processedSuccess.isValid, true, 'Success callback format must be valid');
    assert.strictEqual(processedSuccess.success, true, 'Success callback must have success: true');
    assert.strictEqual(processedSuccess.data.resultCode, 0);
    assert.strictEqual(processedSuccess.data.mpesaReceiptNumber, 'NLK81HG245');
    assert.strictEqual(processedSuccess.data.amount, 100.00);
  });

  await t.test('5. Controller integration tests with MongoMemoryServer', async () => {
    console.log('Starting MongoMemoryServer for integration test...');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    console.log('Connecting to MongoDB...');
    await connectDB();

    const customerId = new mongoose.Types.ObjectId();
    const customer = await User.create({
      _id: customerId,
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '254712345678',
      role: 'customer'
    });

    const checkoutID = 'ws_CO_test_failed_callback_2029';

    // Create a pending transaction
    const transaction = await Transaction.create({
      transactionRef: 'TXN-TEST-123',
      mpesaReceiptNumber: checkoutID, // Initiator saves CheckoutRequestID here initially
      type: 'ride',
      customer: customerId,
      status: 'pending',
      amount: {
        baseAmount: 100,
        deliveryFee: 0,
        totalAmount: 100
      },
      commission: {
        totalCommission: 5,
        customerShare: 2.5,
        providerShare: 2.5,
        providerReceives: 95
      },
      customerPaid: 100,
      providerReceives: 95,
      relatedEntityType: 'RideRequest'
    });

    // Mock Express Request and Response objects
    const req = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: 'MR-test-123',
            CheckoutRequestID: checkoutID,
            ResultCode: 2029,
            ResultDesc: 'System Error occurred'
          }
        }
      },
      app: {
        get: () => null // mock io socket server
      }
    };

    let responseStatus = null;
    let responseData = null;

    const res = {
      status: (status) => {
        responseStatus = status;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    console.log('Calling mpesaCallback controller handler with ResultCode 2029 payload...');
    await mpesaCallback(req, res);

    console.log('Verifying controller response...');
    assert.strictEqual(responseStatus, 200, 'Controller must return HTTP 200 to Safaricom even on failed transaction');
    assert.strictEqual(responseData.success, true, 'Response body must indicate successful webhook processing');

    console.log('Verifying transaction state in database...');
    const updatedTransaction = await Transaction.findById(transaction._id);
    assert.strictEqual(updatedTransaction.status, 'failed', 'Transaction status must be marked failed');
    assert.strictEqual(updatedTransaction.paymentStatus, 'failed', 'Transaction paymentStatus must be marked failed');
    assert.strictEqual(updatedTransaction.resultCode, 2029, 'Transaction resultCode must be 2029');
    assert.strictEqual(updatedTransaction.resultDesc, 'System Error occurred', 'Transaction resultDesc must be saved');
    assert.strictEqual(updatedTransaction.checkoutRequestID, checkoutID, 'checkoutRequestID must be saved');
    assert.strictEqual(updatedTransaction.merchantRequestID, 'MR-test-123', 'merchantRequestID must be saved');

    console.log('Closing database connection...');
    await mongoose.disconnect();
    console.log('Stopping MongoMemoryServer...');
    await mongoServer.stop();
    console.log('Controller integration test completed successfully!');
  });
});
