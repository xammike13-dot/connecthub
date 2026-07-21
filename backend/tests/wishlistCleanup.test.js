import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import connectDB from '../config/db.js';
import { deleteProduct } from '../controllers/productController.js';
import { getWishlist } from '../controllers/wishlistController.js';

test('Wishlist Automatic Cleanup and Deleted Product Removal Verification', async (t) => {
  console.log('Starting MongoMemoryServer for Wishlist Cleanup test...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  console.log('Connecting to MongoDB...');
  await connectDB();

  // 1. Setup mock Business and Customer
  const business = await User.create({
    name: 'Test Business',
    email: 'business@example.com',
    password: 'password123',
    phone: '+254700000001',
    role: 'business',
    businessProfile: {
      businessName: 'Clean Shop',
      businessLocation: 'Nairobi',
      businessContact: '+254700000001',
    },
  });

  const customer = await User.create({
    name: 'Test Customer',
    email: 'customer@example.com',
    password: 'password123',
    phone: '+254700000002',
    role: 'customer',
  });

  // 2. Create products
  const productA = await Product.create({
    business: business._id,
    name: 'Product A',
    description: 'First test product',
    price: 100,
    category: 'Household',
    stock: 10,
  });

  const productB = await Product.create({
    business: business._id,
    name: 'Product B',
    description: 'Second test product',
    price: 200,
    category: 'Food',
    stock: 5,
  });

  // 3. Create Wishlist containing both products
  const wishlist = await Wishlist.create({
    customer: customer._id,
    products: [
      { product: productA._id },
      { product: productB._id },
    ],
  });

  await t.test('1. Deleting a product automatically pulls it from customer wishlists', async () => {
    // Mock req, res, next for deleteProduct
    const req = {
      params: { productId: productA._id.toString() },
      user: business,
      app: {
        get: (name) => {
          if (name === 'io') return { emit: () => {} };
          return null;
        }
      }
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
        console.error('[TEST NEXT ERROR]', err);
        throw err;
      }
    };

    // Execute deleteProduct controller
    try {
      await deleteProduct(req, res, next);
    } catch (err) {
      console.error('[TEST TRY-CATCH ERROR]', err);
      throw err;
    }

    assert.equal(responseStatus, 200);
    assert.equal(responseData.success, true);

    // Verify productA is removed from customer wishlist in DB
    const updatedWishlist = await Wishlist.findOne({ customer: customer._id });
    assert.equal(updatedWishlist.products.length, 1);
    assert.equal(updatedWishlist.products[0].product.toString(), productB._id.toString());
  });

  await t.test('2. getWishlist automatically handles, filters, and saves any legacy null product references', async () => {
    // Manually push a mock legacy null reference or delete productB directly from Product collection
    // to simulate a scenario where a product was deleted without triggering the pull hook (or legacy data).
    await Product.findByIdAndDelete(productB._id);

    // Now, productB is gone from Product collection, but is still in wishlist.products array in DB.
    const preWishlist = await Wishlist.findOne({ customer: customer._id });
    assert.equal(preWishlist.products.length, 1); // contains productB ref which is now deleted

    // Mock getWishlist req, res
    const req = {
      user: customer,
      query: { page: 1, limit: 10 },
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
      if (err) {
        console.error('[TEST WISHLIST NEXT ERROR]', err);
        throw err;
      }
    };

    // Execute getWishlist
    try {
      await getWishlist(req, res, next);
    } catch (err) {
      console.error('[TEST WISHLIST TRY-CATCH ERROR]', err);
      throw err;
    }

    assert.equal(responseStatus, 200);
    assert.equal(responseData.success, true);
    // Verified: valid products returned is 0 because all references were deleted
    assert.equal(responseData.data.length, 0);

    // Verify DB was automatically cleaned up and updated
    const finalWishlist = await Wishlist.findOne({ customer: customer._id });
    assert.equal(finalWishlist.products.length, 0);
  });

  console.log('Closing database connection...');
  await mongoose.connection.close();

  console.log('Stopping MongoMemoryServer...');
  await mongoServer.stop();
});
