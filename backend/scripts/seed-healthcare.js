import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connecthub';

async function seed() {
  console.log('Seeding healthcare products and users...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  // Clean existing
  await User.deleteMany({ email: { $in: ['customer@example.com', 'healthstore@example.com'] } });
  await Product.deleteMany({ category: 'healthcare' });

  // Create Business
  const business = await User.create({
    name: 'Aga Khan Pharmacy',
    email: 'healthstore@example.com',
    password: 'password123',
    phone: '+254711111111',
    role: 'business',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
    businessProfile: {
      businessName: 'Aga Khan Pharmacy',
      businessLocation: 'Nairobi',
      businessCategory: 'healthcare',
      businessContact: '+254711111111',
    },
  });

  // Create Customer
  const customer = await User.create({
    name: 'John Doe',
    email: 'customer@example.com',
    password: 'password123',
    phone: '+254722222222',
    role: 'customer',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    accountActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
  });

  // Create Healthcare Products
  await Product.create([
    {
      name: 'Aspirin 100mg Pain Reliever',
      description: 'Standard aspirin tablets for headache and minor pain relief.',
      price: 150,
      originalPrice: 200,
      category: 'healthcare',
      stock: 50,
      business: business._id,
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'],
      isActive: true,
    },
    {
      name: 'Comprehensive First Aid Kit Pro',
      description: 'Fully stocked medical kit with bandages, antiseptic, and shears.',
      price: 1250,
      category: 'healthcare',
      stock: 20,
      business: business._id,
      images: ['https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300'],
      isActive: true,
    }
  ]);

  console.log('Seeding finished successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
