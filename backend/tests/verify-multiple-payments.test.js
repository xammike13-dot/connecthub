import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Multiple transactions can save with null or duplicate relatedEntity without E11000 duplicate key error', async (t) => {
  console.log('Starting MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('Connecting to MongoDB at:', mongoUri);
  await connectDB();

  // Create a customer user ID for tests
  const customerId = new mongoose.Types.ObjectId();
  const landlordId = new mongoose.Types.ObjectId();
  const rentalId = new mongoose.Types.ObjectId();

  try {
    // 1. Clear any previous test transactions if needed
    console.log('Clearing existing test transactions...');
    await Transaction.deleteMany({ customer: customerId });

    // 2. Try creating the first transaction with relatedEntity: null
    console.log('Creating first transaction with relatedEntity: null...');
    const t1 = await Transaction.create({
      transactionRef: `TEST-REF-1-${Date.now()}`,
      type: 'rental',
      customer: customerId,
      provider: landlordId,
      status: 'pending',
      amount: {
        baseAmount: 1000,
        deliveryFee: 0,
        platformFee: 50,
        customerShare: 25,
        providerShare: 25,
        customerPays: 1025,
        providerReceives: 975,
        platformReceives: 50,
        totalAmount: 1025,
      },
      commission: {
        totalCommission: 50,
        customerShare: 25,
        providerShare: 25,
        providerReceives: 975,
      },
      customerPaid: 1025,
      providerReceives: 975,
      relatedEntity: null,
      relatedEntityType: 'Rental',
    });
    assert.ok(t1._id);
    console.log('First transaction created successfully with ID:', t1._id);

    // 3. Try creating the second transaction with relatedEntity: null
    console.log('Creating second transaction with relatedEntity: null...');
    const t2 = await Transaction.create({
      transactionRef: `TEST-REF-2-${Date.now()}`,
      type: 'rental',
      customer: customerId,
      provider: landlordId,
      status: 'pending',
      amount: {
        baseAmount: 1000,
        deliveryFee: 0,
        platformFee: 50,
        customerShare: 25,
        providerShare: 25,
        customerPays: 1025,
        providerReceives: 975,
        platformReceives: 50,
        totalAmount: 1025,
      },
      commission: {
        totalCommission: 50,
        customerShare: 25,
        providerShare: 25,
        providerReceives: 975,
      },
      customerPaid: 1025,
      providerReceives: 975,
      relatedEntity: null,
      relatedEntityType: 'Rental',
    });
    assert.ok(t2._id);
    console.log('Second transaction created successfully with ID:', t2._id);

    // 4. Try creating two transactions with the same non-null relatedEntity (representing monthly rent payments)
    console.log('Creating third transaction with relatedEntity:', rentalId);
    const t3 = await Transaction.create({
      transactionRef: `TEST-REF-3-${Date.now()}`,
      type: 'rental',
      customer: customerId,
      provider: landlordId,
      status: 'completed',
      amount: {
        baseAmount: 5000,
        deliveryFee: 0,
        platformFee: 250,
        customerShare: 125,
        providerShare: 125,
        customerPays: 5125,
        providerReceives: 4875,
        platformReceives: 250,
        totalAmount: 5125,
      },
      commission: {
        totalCommission: 250,
        customerShare: 125,
        providerShare: 125,
        providerReceives: 4875,
      },
      customerPaid: 5125,
      providerReceives: 4875,
      relatedEntity: rentalId,
      relatedEntityType: 'rental',
    });
    assert.ok(t3._id);

    console.log('Creating fourth transaction with same relatedEntity:', rentalId);
    const t4 = await Transaction.create({
      transactionRef: `TEST-REF-4-${Date.now()}`,
      type: 'rental',
      customer: customerId,
      provider: landlordId,
      status: 'completed',
      amount: {
        baseAmount: 5000,
        deliveryFee: 0,
        platformFee: 250,
        customerShare: 125,
        providerShare: 125,
        customerPays: 5125,
        providerReceives: 4875,
        platformReceives: 250,
        totalAmount: 5125,
      },
      commission: {
        totalCommission: 250,
        customerShare: 125,
        providerShare: 125,
        providerReceives: 4875,
      },
      customerPaid: 5125,
      providerReceives: 4875,
      relatedEntity: rentalId,
      relatedEntityType: 'rental',
    });
    assert.ok(t4._id);
    console.log('Transactions with duplicate non-null relatedEntity created successfully!');

    // Cleanup test transactions
    await Transaction.deleteMany({ customer: customerId });
  } finally {
    console.log('Closing database connection...');
    await mongoose.disconnect();
    console.log('Stopping MongoMemoryServer...');
    await mongoServer.stop();
    console.log('Test completed successfully!');
  }
});
