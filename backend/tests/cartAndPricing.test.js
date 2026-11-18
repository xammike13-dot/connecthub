import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRidePayment, calculateShoppingPayment } from '../utils/paymentCalculator.js';

test('Cart and Order Pricing Logic Verification', async (t) => {
  await t.test('1. calculateShoppingPayment correctly handles base price + extras', () => {
    const basePrice = 2500;
    const addOnsTotal = 300; // e.g. Silicone Case (200) + Lanyard (100)
    const unitPrice = basePrice + addOnsTotal; // 2800
    const quantity = 2;
    const totalItemPrice = unitPrice * quantity; // 5600
    const deliveryFee = 100;

    const breakdown = calculateShoppingPayment(totalItemPrice, deliveryFee);

    assert.equal(breakdown.basePrice, 5600);
    assert.equal(breakdown.deliveryFee, 100);
    assert.equal(breakdown.customerPays, 5700, 'Customer pays product total plus delivery only');
    assert.equal(breakdown.providerReceives, 5700, 'Provider receives the full product and delivery amount');
    assert.equal(breakdown.platformFee, 0);
  });

  await t.test('Customer totals exclude platform fees for shopping and rides', () => {
    const shopping = calculateShoppingPayment(2000, 100);
    const ride = calculateRidePayment(150);

    assert.equal(shopping.customerPays, 2100);
    assert.equal(shopping.platformFee, 0);
    assert.equal(ride.customerPays, 150);
    assert.equal(ride.platformFee, 0);
  });

  await t.test('2. Cart keys correctly distinguish different variations of same product', () => {
    const buildCartKey = (productId, selectedOptions = {}, selectedAddOns = []) => {
      const optStr = JSON.stringify(
        Object.fromEntries(Object.entries(selectedOptions).sort())
      );
      const addStr = [...selectedAddOns].map(a => a.name).sort().join(',');
      return `${productId}__${optStr}__${addStr}`;
    };

    const productId = '654321654321654321654321';
    
    const key1 = buildCartKey(productId, { Size: '40', Color: 'Black' });
    const key2 = buildCartKey(productId, { Size: '41', Color: 'Black' });
    const key3 = buildCartKey(productId, { Color: 'Black', Size: '40' }); // same values, different insertion order
    const key4 = buildCartKey(productId, { Size: '40', Color: 'Black' }, [{ name: 'Extra Cable', price: 150 }]);

    assert.notEqual(key1, key2, 'Different sizes must produce different cart keys');
    assert.equal(key1, key3, 'Different key ordering must normalize to same cart key');
    assert.notEqual(key1, key4, 'Items with different add-ons must produce different cart keys');
  });
});
