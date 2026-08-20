import test from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, getProducts, updateProduct, getMyProducts } from '../controllers/productController.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

test('Product Category & Business Category Controller Logic', async (t) => {
  // Save original functions
  const origProductCreate = Product.create;
  const origProductFind = Product.find;
  const origProductFindById = Product.findById;
  const origProductFindByIdAndUpdate = Product.findByIdAndUpdate;
  const origProductCountDocuments = Product.countDocuments;
  const origUserFindByIdAndUpdate = User.findByIdAndUpdate;
  const origUserFindById = User.findById;

  await t.test('createProduct stores separate businessCategory, category, and subcategory', async () => {
    let createdDoc = null;
    Product.create = async (data) => {
      createdDoc = { _id: 'prod-123', ...data };
      return createdDoc;
    };
    User.findByIdAndUpdate = async () => {};

    const req = {
      user: { _id: 'biz-1', role: 'business' },
      body: {
        name: 'Organic Apples',
        description: 'Fresh local apples',
        price: 250,
        businessCategory: 'Shop',
        category: 'Food',
        subcategory: 'Fresh Produce',
        stock: 50,
      },
      app: { get: () => null },
    };

    let resCode = null;
    let resData = null;
    const res = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => {
            resData = data;
          },
        };
      },
    };

    await createProduct(req, res, () => {});

    assert.equal(resCode, 201);
    assert.equal(resData.success, true);
    assert.equal(createdDoc.businessCategory, 'Shop');
    assert.equal(createdDoc.category, 'Food');
    assert.equal(createdDoc.subcategory, 'Fresh Produce');
  });

  await t.test('createProduct defaults businessCategory from user businessProfile if omitted', async () => {
    let createdDoc = null;
    Product.create = async (data) => {
      createdDoc = { _id: 'prod-124', ...data };
      return createdDoc;
    };
    User.findById = (id) => ({
      select: async () => ({
        businessProfile: { businessCategory: 'Electronics' },
      }),
    });
    User.findByIdAndUpdate = async () => {};

    const req = {
      user: { _id: 'biz-1', role: 'business' },
      body: {
        name: 'Smartphone Charger',
        description: 'Fast USB-C charger',
        price: 1200,
        category: 'Accessories',
        subcategory: 'Chargers',
        stock: 20,
      },
      app: { get: () => null },
    };

    let resCode = null;
    let resData = null;
    const res = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => {
            resData = data;
          },
        };
      },
    };

    await createProduct(req, res, () => {});

    assert.equal(resCode, 201);
    assert.equal(resData.success, true);
    assert.equal(createdDoc.businessCategory, 'Electronics');
    assert.equal(createdDoc.category, 'Accessories');
    assert.equal(createdDoc.subcategory, 'Chargers');
  });

  await t.test('getProducts filters by businessCategory or legacy category correctly', async () => {
    let queryPassed = null;
    Product.find = (query) => {
      queryPassed = query;
      return {
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: async () => [
                {
                  _id: 'prod-1',
                  name: 'Paracetamol',
                  businessCategory: 'Healthcare',
                  category: 'Medicine',
                  subcategory: 'Pain Relief',
                },
              ],
            }),
          }),
        }),
      };
    };
    Product.countDocuments = async () => 1;

    const req = {
      query: {
        businessCategory: 'Healthcare',
        page: 1,
        limit: 10,
      },
    };

    let resCode = null;
    let resData = null;
    const res = {
      status: (code) => {
        resCode = code;
        return {
          json: (data) => {
            resData = data;
          },
        };
      },
    };

    await getProducts(req, res, () => {});

    assert.equal(resCode, 200);
    assert.equal(resData.data.length, 1);
    assert.ok(queryPassed.$or);
  });

  // Restore original functions
  Product.create = origProductCreate;
  Product.find = origProductFind;
  Product.findById = origProductFindById;
  Product.findByIdAndUpdate = origProductFindByIdAndUpdate;
  Product.countDocuments = origProductCountDocuments;
  User.findByIdAndUpdate = origUserFindByIdAndUpdate;
  User.findById = origUserFindById;
});
