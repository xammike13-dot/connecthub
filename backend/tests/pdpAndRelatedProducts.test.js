import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../models/Product.js';
import Rental from '../models/Rental.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import { getProduct, getRelatedProducts } from '../controllers/productController.js';
import { getRental } from '../controllers/rentalController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('PDP, Rental Details, and Related Products Infinite Scroll Tests', async (t) => {
  console.log('Starting MongoMemoryServer for PDP tests...');
  const mongoServer = await MongoMemoryServer.create({
    instance: {},
    spawn: { timeout: 60000 },
  });
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  await connectDB();

  // Create Business User
  const businessUser = await User.create({
    name: 'Apex Merchant',
    email: 'merchant@example.com',
    password: 'password123',
    phone: '+254700111222',
    role: 'business',
    avatar: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
    businessProfile: {
      businessName: 'Apex Electronics & Tech',
      campusLocation: 'Stage',
      businessLogo: 'https://res.cloudinary.com/demo/image/upload/logo.jpg',
      businessCategory: 'Electronics & Gadgets',
      rating: 4.9,
    },
  });

  // Create Landlord User
  const landlordUser = await User.create({
    name: 'Samuel Landlord',
    email: 'samuel@example.com',
    password: 'password123',
    phone: '+254711333444',
    role: 'landlord',
    avatar: 'https://res.cloudinary.com/demo/image/upload/landlord.jpg',
    landlordProfile: {
      propertyName: 'Cheba Heights Residency',
      propertyLocation: 'Chebarus',
      contactDetails: '+254711333444',
      rating: 4.8,
    },
  });

  // Create Caretaker User
  const caretakerUser = await User.create({
    name: 'Dennis Caretaker',
    email: 'caretaker@example.com',
    password: 'password123',
    phone: '+254722555666',
    role: 'caretaker',
  });

  // Create Main Product with variations and addOns
  const mainProduct = await Product.create({
    business: businessUser._id,
    name: 'Wireless Bluetooth Earbuds Pro',
    description: 'High-fidelity audio with active noise cancellation and 30-hour battery life.',
    price: 2500,
    originalPrice: 3500,
    category: 'Tech & Gadgets',
    subcategory: 'Audio',
    condition: 'New',
    brand: 'SoundCore',
    images: [
      'https://res.cloudinary.com/demo/image/upload/earbuds-main.jpg',
      'https://res.cloudinary.com/demo/image/upload/earbuds-side.jpg',
      'https://res.cloudinary.com/demo/image/upload/earbuds-case.jpg',
    ],
    stock: 15,
    stockCount: 15,
    variations: [
      { name: 'Color', options: ['Midnight Black', 'Pearl White', 'Navy Blue'] },
    ],
    addOns: [
      { name: 'Silicone Protective Case', price: 200 },
      { name: 'Lanyard Strap', price: 100 },
    ],
    isActive: true,
  });

  // Create 15 Category Products (Tech & Gadgets)
  const categoryProducts = [];
  for (let i = 1; i <= 15; i++) {
    categoryProducts.push(await Product.create({
      business: businessUser._id,
      name: `Tech Gadget Item ${i}`,
      description: `Description for gadget ${i}`,
      price: 2000 + i * 50,
      category: 'Tech & Gadgets',
      subcategory: i <= 5 ? 'Audio' : 'Accessories',
      images: [`https://res.cloudinary.com/demo/image/upload/gadget-${i}.jpg`],
      stock: 10,
      isActive: true,
    }));
  }

  // Create 5 Other Category Products (Food & Drinks)
  for (let i = 1; i <= 5; i++) {
    await Product.create({
      business: businessUser._id,
      name: `Food Item ${i}`,
      description: `Delicious meal ${i}`,
      price: 300 + i * 20,
      category: 'Food & Drinks',
      images: [`https://res.cloudinary.com/demo/image/upload/food-${i}.jpg`],
      stock: 20,
      isActive: true,
    });
  }

  // Create Rental Property
  const mainRental = await Rental.create({
    landlord: landlordUser._id,
    caretaker: caretakerUser._id,
    rentalName: 'Executive 1-Bedroom Apartment',
    rentalType: 'one-bedroom',
    monthlyPrice: 8500,
    rentalPeriod: 'month',
    bedrooms: 1,
    bathrooms: 1,
    location: 'cheba',
    amenities: ['wifi', 'security', 'balcony', 'parking'],
    description: 'Spacious self-contained one-bedroom apartment with 24/7 water and high-speed Wi-Fi.',
    images: [
      { url: 'https://res.cloudinary.com/demo/image/upload/rental-living.jpg', publicId: 'living' },
      { url: 'https://res.cloudinary.com/demo/image/upload/rental-bed.jpg', publicId: 'bed' },
    ],
    isAvailable: true,
    views: 12,
    favoritesCount: 4,
  });

  await t.test('1. getProduct returns populated business details, variations, and addOns', async () => {
    let responseData = null;
    let statusCode = null;

    const req = { params: { productId: mainProduct._id.toString() } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
        return this;
      },
    };

    await getProduct(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.data.name, 'Wireless Bluetooth Earbuds Pro');
    assert.equal(responseData.data.price, 2500);
    assert.equal(responseData.data.images.length, 3);
    assert.equal(responseData.data.variations.length, 1);
    assert.equal(responseData.data.variations[0].name, 'Color');
    assert.equal(responseData.data.addOns.length, 2);
    assert.equal(responseData.data.business.name, 'Apex Merchant');
    assert.equal(responseData.data.business.businessProfile.businessName, 'Apex Electronics & Tech');
  });

  await t.test('2. getRelatedProducts excludes current product and filters by category', async () => {
    let responseData = null;
    let statusCode = null;

    const req = {
      params: { productId: mainProduct._id.toString() },
      query: { page: '1', limit: '10' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
        return this;
      },
    };

    await getRelatedProducts(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.data.length, 10);
    
    // Ensure current product is excluded
    const currentIncluded = responseData.data.some((p) => p._id.toString() === mainProduct._id.toString());
    assert.equal(currentIncluded, false, 'Current product must be excluded');

    // Ensure all returned products belong to Tech & Gadgets category
    const allCategory = responseData.data.every((p) => p.category === 'Tech & Gadgets');
    assert.equal(allCategory, true, 'Related products must belong to Tech & Gadgets');

    // Verify pagination metadata
    assert.equal(responseData.pagination.currentPage, 1);
    assert.equal(responseData.pagination.perPage, 10);
    assert.equal(responseData.pagination.hasMore, true);
    assert.equal(responseData.pagination.nextPage, 2);
  });

  await t.test('3. getRelatedProducts page 2 pagination and no duplicates', async () => {
    // Page 1
    let page1Data = null;
    const req1 = {
      params: { productId: mainProduct._id.toString() },
      query: { page: '1', limit: '10' },
    };
    const res1 = {
      status: () => res1,
      json: (payload) => { page1Data = payload; },
    };
    await getRelatedProducts(req1, res1);

    // Page 2
    let page2Data = null;
    const req2 = {
      params: { productId: mainProduct._id.toString() },
      query: { page: '2', limit: '10' },
    };
    const res2 = {
      status: () => res2,
      json: (payload) => { page2Data = payload; },
    };
    await getRelatedProducts(req2, res2);

    assert.equal(page2Data.success, true);
    assert.equal(page2Data.pagination.currentPage, 2);

    // Check no overlap between page 1 and page 2
    const page1Ids = new Set(page1Data.data.map((p) => p._id.toString()));
    const hasDuplicate = page2Data.data.some((p) => page1Ids.has(p._id.toString()));
    assert.equal(hasDuplicate, false, 'Page 2 must not contain products from Page 1');
  });

  await t.test('4. getRelatedProducts prioritizes same subcategory (Audio)', async () => {
    let responseData = null;
    const req = {
      params: { productId: mainProduct._id.toString() },
      query: { page: '1', limit: '5' },
    };
    const res = {
      status: () => res,
      json: (payload) => { responseData = payload; },
    };
    await getRelatedProducts(req, res);

    // The top results should prioritize subcategory 'Audio'
    const topResults = responseData.data.slice(0, 3);
    const audioCount = topResults.filter((p) => p.subcategory === 'Audio').length;
    assert.ok(audioCount >= 2, 'Top results should prioritize same subcategory (Audio)');
  });

  await t.test('5. getRental returns rental details, rental period, landlord, and caretaker', async () => {
    let responseData = null;
    let statusCode = null;

    const req = {
      params: { rentalId: mainRental._id.toString() },
      user: null,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseData = payload;
        return this;
      },
    };

    await getRental(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.data.rentalName, 'Executive 1-Bedroom Apartment');
    assert.equal(responseData.data.monthlyPrice, 8500);
    assert.equal(responseData.data.rentalPeriod, 'month');
    assert.equal(responseData.data.bedrooms, 1);
    assert.equal(responseData.data.bathrooms, 1);
    assert.equal(responseData.data.location, 'cheba');
    assert.equal(responseData.data.landlord.name, 'Samuel Landlord');
    assert.equal(responseData.data.landlord.landlordProfile.propertyName, 'Cheba Heights Residency');
    assert.equal(responseData.data.caretaker.name, 'Dennis Caretaker');
  });

  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('PDP and Related Products tests completed successfully.');
});
