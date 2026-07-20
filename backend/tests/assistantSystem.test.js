import mongoose from 'mongoose';

// Stub mongoose.Model query methods globally at the very top of the file before other imports
mongoose.Model.findById = async function() {
  return {
    _id: '64a7c29e92bc443f5505dc24',
    businessProfile: {
      rating: 4.8,
    },
  };
};

mongoose.Model.findOne = async function() {
  return {
    _id: '64a7c29e92bc443f5505dc24',
    businessProfile: {
      rating: 4.8,
    },
  };
};

import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveBusinessId, getAssistantDashboardStats } from '../controllers/assistantController.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

test('1. Verify getActiveBusinessId context derivation helper', () => {
  const businessOwner = {
    _id: '64a7c29e92bc443f5505dc24',
    role: 'business',
  };

  const activeAssistant = {
    _id: '64a7c29e92bc443f5505dc25',
    role: 'assistant',
    assistantProfile: {
      business: '64a7c29e92bc443f5505dc24',
      status: 'active',
    },
  };

  const disabledAssistant = {
    _id: '64a7c29e92bc443f5505dc25',
    role: 'assistant',
    assistantProfile: {
      business: '64a7c29e92bc443f5505dc24',
      status: 'disabled',
    },
  };

  const customerUser = {
    _id: '64a7c29e92bc443f5505dc26',
    role: 'customer',
  };

  // Business owner gets their own ID
  assert.equal(getActiveBusinessId(businessOwner).toString(), businessOwner._id.toString());

  // Active assistant gets business owner's ID
  assert.equal(getActiveBusinessId(activeAssistant).toString(), businessOwner._id.toString());

  // Disabled assistant gets null
  assert.equal(getActiveBusinessId(disabledAssistant), null);

  // Customer gets null
  assert.equal(getActiveBusinessId(customerUser), null);
});

test('2. Verify getAssistantDashboardStats returns operational details & omits financials', async () => {
  const originalProductFind = Product.find;
  const originalOrderFind = Order.find;

  // Mock product database find
  Product.find = () => {
    return [
      { _id: 'prod-1', isActive: true, stock: 10 },
      { _id: 'prod-2', isActive: true, stock: 0 },
      { _id: 'prod-3', isActive: false, stock: 5 },
    ];
  };

  // Mock orders database find
  const mockOrdersArray = [
    { _id: 'order-1', status: 'pending', items: [{}], totalAmount: 100, finalAmount: 100, createdAt: new Date() },
    { _id: 'order-2', status: 'completed', items: [{}, {}], totalAmount: 250, finalAmount: 250, createdAt: new Date() },
  ];
  mockOrdersArray.sort = () => mockOrdersArray;
  mockOrdersArray.slice = () => mockOrdersArray;

  Order.find = () => mockOrdersArray;

  const req = {
    user: {
      _id: '64a7c29e92bc443f5505dc25',
      role: 'assistant',
      assistantProfile: {
        business: '64a7c29e92bc443f5505dc24',
        status: 'active',
      },
    },
  };

  let responseStatus = null;
  let responseData = null;

  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseData = data;
        }
      };
    }
  };

  const next = (err) => {
    if (err) console.error('TEST CAUGHT NEXT ERROR:', err);
  };

  // Call getAssistantDashboardStats
  getAssistantDashboardStats(req, res, next);

  // Wait for microtask queue to empty so the inner async fn completes
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    assert.equal(responseStatus, 200);
    assert.equal(responseData.success, true);

    const stats = responseData.data;
    assert.equal(stats.totalProducts, 3);
    assert.equal(stats.activeProducts, 1); // stock > 0 && isActive === true
    assert.equal(stats.outOfStockProducts, 1); // stock <= 0
    assert.equal(stats.totalOrders, 2);
    assert.equal(stats.pendingOrders, 1);
    assert.equal(stats.completedOrders, 1);
    assert.equal(stats.rating, 4.8);
    assert.equal(stats.recentOrders.length, 2);

    // Assert absolute absence of financial analytics
    assert.equal(stats.availableBalance, undefined);
    assert.equal(stats.pendingBalance, undefined);
    assert.equal(stats.totalRevenue, undefined);
    assert.equal(stats.totalEarnings, undefined);
    assert.equal(stats.totalWithdrawn, undefined);
  } finally {
    Product.find = originalProductFind;
    Order.find = originalOrderFind;
  }
});
