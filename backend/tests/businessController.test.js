import test from 'node:test';
import assert from 'node:assert/strict';
import { getCustomers } from '../controllers/businessController.js';
import Order from '../models/Order.js';

// Simple mock for mongoose find and populate
test('getCustomers aggregated stats logic works correctly', async () => {
  const originalFind = Order.find;

  // Mocking Order.find
  Order.find = () => {
    return {
      populate: () => {
        return {
          sort: () => {
            return [
              {
                _id: 'order-1',
                customer: {
                  _id: 'cust-1',
                  name: 'Test Customer',
                  email: 'test@example.com',
                  phone: '+254700000000',
                },
                finalAmount: 1500,
                totalAmount: 1500,
                status: 'completed',
                deliveryAddress: {
                  phone: '+254711111111',
                  address: '123 Test St',
                },
                createdAt: new Date('2026-07-01'),
              },
              {
                _id: 'order-2',
                customer: {
                  _id: 'cust-1',
                  name: 'Test Customer',
                  email: 'test@example.com',
                  phone: '+254700000000',
                },
                finalAmount: 2500,
                totalAmount: 2500,
                status: 'completed',
                deliveryAddress: {
                  phone: '+254711111111',
                  address: '123 Test St',
                },
                createdAt: new Date('2026-07-15'),
              }
            ];
          }
        };
      }
    };
  };

  const req = {
    user: { _id: 'business-1', role: 'business' },
    query: { search: '', page: 1, limit: 10 }
  };

  let responseData = null;
  let responseStatus = null;

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
    if (err) {
      console.error('TEST CAUGHT ERROR IN NEXT:', err);
    }
  };

  try {
    await getCustomers(req, res, next);

    assert.equal(responseStatus, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.data.length, 1);

    const aggregatedCustomer = responseData.data[0];
    assert.equal(aggregatedCustomer.id, 'cust-1');
    assert.equal(aggregatedCustomer.name, 'Test Customer');
    assert.equal(aggregatedCustomer.email, 'test@example.com');
    assert.equal(aggregatedCustomer.phone, '+254711111111');
    assert.equal(aggregatedCustomer.orderCount, 2);
    assert.equal(aggregatedCustomer.totalSpent, 4000);
    assert.equal(aggregatedCustomer.status, 'completed');

    assert.equal(responseData.stats.totalCustomers, 1);
    assert.equal(responseData.stats.repeatCustomers, 1);
    assert.equal(responseData.stats.totalSales, 4000);
    assert.equal(responseData.stats.averageSpending, 4000);
  } finally {
    // Restore
    Order.find = originalFind;
  }
});
