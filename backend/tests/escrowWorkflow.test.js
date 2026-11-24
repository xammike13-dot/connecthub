import test from 'node:test';
import assert from 'node:assert/strict';
import RideRequest from '../models/RideRequest.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import { markRiderArrived, confirmRideCompletion, disputeRide } from '../controllers/rideController.js';
import { markOrderDelivered, confirmDelivery, disputeOrder } from '../controllers/orderController.js';

// Mock Notification calls to avoid buffering timeouts in unit tests
Notification.create = async () => ({ _id: 'notif_test_id' });
Notification.find = () => Promise.resolve([]);
Notification.findOneAndUpdate = async () => ({ _id: 'notif_test_id' });
Notification.deleteMany = async () => ({ acknowledged: true });

test('OLAFasta Escrow & Confirmation Workflows', async (t) => {
  const customerId = '654321654321654321654321';
  const riderId = '123456123456123456123456';
  const businessId = '789012789012789012789012';
  const otherCustomerId = '999999999999999999999999';

  await t.test('1. Rider cannot release escrow by marking arrived; status moves to awaiting_customer_confirmation', async () => {
    const mockRide = {
      _id: 'ride12345678901234567890',
      rider: riderId,
      customer: customerId,
      status: 'in_progress',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      fundsReleased: false,
      trackingHistory: [],
      dropoffLocation: { coordinates: [35.28, 0.51] },
      save: async function () { return this; },
    };

    RideRequest.findById = () => ({
      populate: () => Promise.resolve(mockRide),
    });

    const req = {
      params: { rideId: mockRide._id },
      user: { _id: riderId, role: 'rider', name: 'Test Rider' },
      app: { get: () => null },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseBody = data; return this; },
    };

    await markRiderArrived(req, res);

    assert.equal(statusCode, 200);
    assert.equal(mockRide.status, 'awaiting_customer_confirmation');
    assert.equal(mockRide.escrowStatus, 'held');
    assert.equal(mockRide.fundsReleased, false, 'Escrow must never be released on rider arrival');
  });

  await t.test('2. Non-rider or wrong rider cannot mark arrived', async () => {
    const mockRide = {
      _id: 'ride12345678901234567890',
      rider: riderId,
      customer: customerId,
      status: 'in_progress',
      save: async function () { return this; },
    };

    RideRequest.findById = () => ({
      populate: () => Promise.resolve(mockRide),
    });

    // Customer trying to mark arrived
    const reqCustomer = {
      params: { rideId: mockRide._id },
      user: { _id: customerId, role: 'customer' },
    };
    const res = { status() { return this; }, json() { return this; } };

    await assert.rejects(
      async () => markRiderArrived(reqCustomer, res),
      /Only the assigned rider can mark arrival/
    );

    // Another rider trying to mark arrived
    const reqWrongRider = {
      params: { rideId: mockRide._id },
      user: { _id: '555555555555555555555555', role: 'rider' },
    };

    await assert.rejects(
      async () => markRiderArrived(reqWrongRider, res),
      /You are not the assigned rider/
    );
  });

  await t.test('3. Customer cannot confirm arrival before rider marks arrived', async () => {
    const mockRide = {
      _id: 'ride12345678901234567890',
      rider: { _id: riderId },
      customer: { _id: customerId },
      status: 'in_progress', // NOT awaiting_customer_confirmation
      paymentStatus: 'paid',
      escrowStatus: 'held',
      fundsReleased: false,
    };

    RideRequest.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(mockRide),
        }),
      }),
    });

    const req = {
      params: { rideId: mockRide._id },
      user: { _id: customerId, role: 'customer' },
    };
    const res = { status() { return this; }, json() { return this; } };

    await assert.rejects(
      async () => confirmRideCompletion(req, res),
      /Ride is not ready for arrival confirmation/
    );
  });

  await t.test('4. Another customer cannot confirm someone else ride', async () => {
    const mockRide = {
      _id: 'ride12345678901234567890',
      rider: { _id: riderId },
      customer: { _id: customerId }, // belongs to customerId
      status: 'awaiting_customer_confirmation',
      paymentStatus: 'paid',
      escrowStatus: 'held',
    };

    RideRequest.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(mockRide),
        }),
      }),
    });

    const req = {
      params: { rideId: mockRide._id },
      user: { _id: otherCustomerId, role: 'customer' },
    };
    const res = { status() { return this; }, json() { return this; } };

    await assert.rejects(
      async () => confirmRideCompletion(req, res),
      /Only the customer can confirm ride completion/
    );
  });

  await t.test('5. Customer confirming arrival completes ride and marks escrow released', async () => {
    let walletUpdated = false;
    let releasedAmount = 0;

    const mockTransaction = {
      _id: 'tx12345678901234567890',
      transactionRef: 'TX_RIDE_001',
      status: 'paid',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      providerReceives: 150,
      escrowReleases: [],
      save: async function () { return this; },
    };

    const mockRide = {
      _id: 'ride12345678901234567890',
      rider: { _id: riderId, toString: () => riderId },
      customer: { _id: customerId, toString: () => customerId },
      status: 'awaiting_customer_confirmation',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      fundsReleased: false,
      fare: { riderReceives: 150 },
      trackingHistory: [],
      transaction: mockTransaction,
      save: async function () { return this; },
    };

    RideRequest.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(mockRide),
        }),
      }),
    });

    Transaction.findById = () => Promise.resolve(mockTransaction);
    Wallet.findOne = () => Promise.resolve({
      user: riderId,
      balance: 100,
      pendingBalance: 150,
      save: async function () {
        this.balance += 150;
        this.pendingBalance -= 150;
        walletUpdated = true;
        releasedAmount = 150;
        return this;
      },
    });

    const req = {
      params: { rideId: mockRide._id },
      user: { _id: customerId, role: 'customer' },
      app: { get: () => null },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseBody = data; return this; },
    };

    await confirmRideCompletion(req, res);

    assert.equal(statusCode, 200);
    assert.equal(mockRide.status, 'completed');
    assert.equal(mockRide.escrowStatus, 'released');
    assert.equal(mockRide.fundsReleased, true);
    assert.equal(mockRide.customerConfirmedArrival, true);
  });

  await t.test('6. Duplicate ride confirmation is idempotent and does not release funds twice', async () => {
    const mockRide = {
      _id: 'ride12345678901234567890',
      rider: { _id: riderId },
      customer: { _id: customerId },
      status: 'completed',
      escrowStatus: 'released',
      fundsReleased: true,
    };

    RideRequest.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(mockRide),
        }),
      }),
    });

    const req = {
      params: { rideId: mockRide._id },
      user: { _id: customerId, role: 'customer' },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseBody = data; return this; },
    };

    await confirmRideCompletion(req, res);

    assert.equal(statusCode, 200);
    assert.match(responseBody.message, /already confirmed/);
  });

  await t.test('7. Business cannot release escrow by marking delivered', async () => {
    const mockOrder = {
      _id: 'ord12345678901234567890',
      business: businessId,
      customer: { _id: customerId },
      status: 'processing',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      fundsReleased: false,
      trackingHistory: [],
      save: async function () { return this; },
    };

    Order.findById = () => ({
      populate: () => Promise.resolve(mockOrder),
    });

    const req = {
      params: { orderId: mockOrder._id },
      user: { _id: businessId, role: 'business', businessProfile: {} },
      app: { get: () => null },
    };

    let statusCode = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { return this; },
    };

    await markOrderDelivered(req, res);

    assert.equal(mockOrder.status, 'delivered');
    assert.equal(mockOrder.escrowStatus, 'held');
    assert.equal(mockOrder.fundsReleased, false, 'Business marking delivered must not release escrow funds');
  });

  await t.test('8. Unpaid orders cannot be marked as delivered', async () => {
    const mockUnpaidOrder = {
      _id: 'ord12345678901234567890',
      business: businessId,
      customer: { _id: customerId },
      status: 'processing',
      paymentStatus: 'pending', // NOT paid
      save: async function () { return this; },
    };

    Order.findById = () => ({
      populate: () => Promise.resolve(mockUnpaidOrder),
    });

    const req = {
      params: { orderId: mockUnpaidOrder._id },
      user: { _id: businessId, role: 'business' },
    };
    const res = { status() { return this; }, json() { return this; } };

    await assert.rejects(
      async () => markOrderDelivered(req, res),
      /Cannot mark an unpaid order as delivered/
    );
  });

  await t.test('9. Customer confirming delivery releases escrow funds to business', async () => {
    const mockTx = {
      _id: 'tx_order_001',
      transactionRef: 'TX_ORD_001',
      status: 'paid',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      commission: { providerReceives: 800 },
      escrowReleases: [],
      save: async function () { return this; },
    };

    const mockOrder = {
      _id: 'ord12345678901234567890',
      business: { _id: businessId, toString: () => businessId },
      customer: { _id: customerId, toString: () => customerId },
      status: 'delivered',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      subtotal: 800,
      finalAmount: 800,
      deliveryFee: 0,
      trackingHistory: [],
      transaction: mockTx,
      save: async function () { return this; },
    };

    Order.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => Promise.resolve(mockOrder),
          }),
        }),
      }),
    });

    Transaction.findById = () => Promise.resolve(mockTx);
    Wallet.findOne = () => Promise.resolve({
      user: businessId,
      balance: 500,
      pendingBalance: 800,
      save: async function () {
        this.balance += 800;
        this.pendingBalance -= 800;
        return this;
      },
    });

    const req = {
      params: { orderId: mockOrder._id },
      user: { _id: customerId, role: 'customer' },
      app: { get: () => null },
    };

    let statusCode = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json() { return this; },
    };

    await confirmDelivery(req, res);

    assert.equal(statusCode, 200);
    assert.equal(mockOrder.status, 'completed');
    assert.equal(mockOrder.escrowStatus, 'released');
    assert.equal(mockOrder.fundsReleased, true);
    assert.equal(mockOrder.paymentStatus, 'released');
  });

  await t.test('10. Disputed order/ride freezes escrow and changes status to disputed', async () => {
    const mockOrder = {
      _id: 'ord_dispute_001',
      customer: { _id: customerId, toString: () => customerId },
      business: { _id: businessId },
      status: 'delivered',
      escrowStatus: 'held',
      trackingHistory: [],
      save: async function () { return this; },
    };

    Order.findById = () => ({
      populate: () => ({
        populate: () => Promise.resolve(mockOrder),
      }),
    });

    const req = {
      params: { orderId: mockOrder._id },
      user: { _id: customerId, role: 'customer' },
      body: { reason: 'Wrong items delivered', details: 'Received item A instead of B' },
      app: { get: () => null },
    };

    const res = { status() { return this; }, json() { return this; } };

    await disputeOrder(req, res);

    assert.equal(mockOrder.status, 'disputed');
    assert.equal(mockOrder.escrowStatus, 'disputed');
    assert.equal(mockOrder.dispute.isDisputed, true);
    assert.equal(mockOrder.dispute.reason, 'Wrong items delivered');
  });
});
