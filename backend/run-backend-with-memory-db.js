import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function seedData(uri) {
  console.log('Seeding demo database for verification...');
  await mongoose.connect(uri);

  // Clear existing
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});

  // Seed exact admin user
  const adminEmail = 'connecthubadmin_prod@gmail.com';
  const adminPassword = 'Password123!';
  const admin = await User.create({
    name: 'ConnectHub Admin',
    email: adminEmail,
    password: adminPassword,
    phone: '0711111111',
    role: 'admin',
    emailVerified: true,
    isVerified: true,
    isActive: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
  });
  console.log('Admin user seeded:', admin.email);

  // Seed customer user
  const customer = await User.create({
    name: 'Jane Customer',
    email: 'customer@gmail.com',
    password: 'Password123!',
    phone: '0722222222',
    role: 'customer',
    emailVerified: true,
    isVerified: true,
    isActive: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
  });

  // Seed business owners
  const business1 = await User.create({
    name: 'Apex Owner',
    email: 'apex@gmail.com',
    password: 'Password123!',
    phone: '0733333333',
    role: 'business',
    emailVerified: true,
    isVerified: true,
    isActive: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
    businessProfile: {
      businessName: 'Apex Electronics',
      businessLocation: 'Nairobi',
      businessCategory: 'Electronics',
      businessContact: '0733333333'
    }
  });

  const business2 = await User.create({
    name: 'Aga Khan Pharmacy',
    email: 'agakhan@gmail.com',
    password: 'Password123!',
    phone: '0744444444',
    role: 'business',
    emailVerified: true,
    isVerified: true,
    isActive: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
    businessProfile: {
      businessName: 'Aga Khan Pharmacy',
      businessLocation: 'Nairobi CBD',
      businessCategory: 'healthcare',
      businessContact: '0744444444'
    }
  });

  // Seed products
  const productActive = await Product.create({
    business: business1._id,
    name: 'Wireless Bluetooth Headphones',
    description: 'High performance active noise cancelling wireless over-ear headphones with superb sound reproduction and premium comfort.',
    price: 3500,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
    stock: 25,
    views: 145,
    isActive: true,
  });

  const productOutOfStock = await Product.create({
    business: business1._id,
    name: 'USB-C Cable Fast Charger',
    description: 'Nylon braided high speed charging USB-C to USB-C cable. Heavy-duty construction and highly compatible.',
    price: 600,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500'],
    stock: 0,
    views: 92,
    isActive: true,
  });

  const productInactive = await Product.create({
    business: business1._id,
    name: 'Retro 12-Cup Coffee Maker',
    description: 'Elegant automatic coffee brewer with programmable delay, strength settings, and vintage accents.',
    price: 7500,
    category: 'Kitchen',
    images: ['https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500'],
    stock: 8,
    views: 14,
    isActive: false,
  });

  const productFlagged = await Product.create({
    business: business1._id,
    name: 'Counterfeit Activation Key',
    description: 'Suspicious unlicensed counterfeit software license key sold at highly discounted rates.',
    price: 150,
    category: 'Software',
    images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'],
    stock: 999,
    views: 8,
    isActive: false,
    isFlagged: true,
  });

  const productHealthcare = await Product.create({
    business: business2._id,
    name: 'Aspirin Pain Reliever 100mg',
    description: 'Effective Aspirin pills for headache, muscle ache, fever, and minor pain alleviation.',
    price: 250,
    category: 'healthcare',
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500'],
    stock: 120,
    views: 65,
    isActive: true,
  });

  // Seed orders referencing products
  await Order.create({
    customer: customer._id,
    business: business1._id,
    orderType: 'marketplace',
    items: [
      {
        product: productActive._id,
        name: productActive.name,
        quantity: 1,
        price: productActive.price,
        image: productActive.images[0]
      }
    ],
    totalAmount: 3500,
    finalAmount: 3600,
    status: 'completed',
    paymentMethod: 'mpesa',
    paymentStatus: 'paid'
  });

  await Order.create({
    customer: customer._id,
    business: business1._id,
    orderType: 'marketplace',
    items: [
      {
        product: productOutOfStock._id,
        name: productOutOfStock.name,
        quantity: 3,
        price: productOutOfStock.price,
        image: productOutOfStock.images[0]
      }
    ],
    totalAmount: 1800,
    finalAmount: 1900,
    status: 'delivered',
    paymentMethod: 'card',
    paymentStatus: 'paid'
  });

  console.log('Demo database seeding complete!');
  await mongoose.disconnect();
}

async function start() {
  console.log('Starting MongoMemoryServer...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
    }
  });
  const uri = mongod.getUri();
  console.log('MongoMemoryServer started at:', uri);

  // Seed the database
  await seedData(uri);

  process.env.MONGODB_URI = uri;

  const child = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    mongod.stop();
    process.exit(code);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    mongod.stop();
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
    mongod.stop();
  });
}

start().catch(err => {
  console.error('Error starting memory server:', err);
});
