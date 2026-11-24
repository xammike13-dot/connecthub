// backend/scripts/seedProducts.js
// Idempotent sample product seeder for Olafasta local development & previews

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env if available
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/olafasta';

const SAMPLE_PRODUCTS = [
  // ── Food & Drinks ──────────────────────────────────────────────────────────
  {
    name: '2-Piece Chicken & Chips',
    description: 'Crispy deep-fried chicken paired with freshly seasoned golden campus fries and chili ketchup. Prepared fresh daily at Stage Food Court.',
    category: 'Food & Drinks',
    categorySlug: 'food-drinks',
    subcategory: 'Restaurant',
    price: 250,
    originalPrice: 320,
    deliveryFee: 0,
    condition: 'New',
    stock: 50,
    stockCount: 50,
    rating: 4.9,
    numReviews: 48,
    isFeatured: true,
    hasVariations: true,
    variations: [
      { name: 'Portion', options: ['Regular (2 Pcs)', 'Comrade Max (3 Pcs)'] },
      { name: 'Spice Level', options: ['Mild', 'Hot Chili', 'Extra Pilipili'] },
    ],
    variants: [
      { name: 'Regular (2 Pcs)', value: 'Regular (2 Pcs)', price: 250, priceAdjustment: 0, stock: 30 },
      { name: 'Comrade Max (3 Pcs)', value: 'Comrade Max (3 Pcs)', price: 340, priceAdjustment: 90, stock: 20 },
    ],
    hasAddOns: true,
    addOns: [
      { name: 'Extra Chili & Garlic Sauce', price: 20, isRequired: false },
      { name: 'Creamy Coleslaw Cup', price: 30, isRequired: false },
      { name: 'Chilled Soda 300ml', price: 60, isRequired: false },
    ],
    images: [
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    name: 'Smokie Pasua with Kachumbari (Pair)',
    description: 'Two legendary campus smokies sliced open and filled with diced fresh tomatoes, onions, coriander, and lemon chili dressing.',
    category: 'Food & Drinks',
    categorySlug: 'food-drinks',
    subcategory: 'Foods',
    price: 70,
    originalPrice: 80,
    deliveryFee: 0,
    condition: 'New',
    stock: 100,
    stockCount: 100,
    rating: 4.8,
    numReviews: 86,
    isFeatured: false,
    hasVariations: false,
    variations: [],
    hasAddOns: true,
    addOns: [
      { name: 'Extra Kachumbari Scoop', price: 10, isRequired: false },
      { name: 'Boiled Egg (Mayai Pasua)', price: 30, isRequired: false },
      { name: 'Tomato Sauce Drizzle', price: 0, isRequired: false },
    ],
    images: [
      'https://images.unsplash.com/photo-1627042633706-01a5e0435423?auto=format&fit=crop&w=800&q=80',
    ],
  },

  // ── Mitumba (Thrift Clothes) ────────────────────────────────────────────────
  {
    name: 'Vintage Corduroy Oversized Jacket',
    description: 'Authentic Grade A thrift corduroy jacket with warm inner lining and button-down front. Perfect for cool Moi University evenings.',
    category: 'Mitumba (Thrift Clothes)',
    categorySlug: 'mitumba-thrift-clothes',
    subcategory: 'Second Hand (Mitumba)',
    price: 850,
    originalPrice: 1200,
    deliveryFee: 0,
    condition: 'Second-hand',
    brand: 'Retro Thrift',
    stock: 12,
    stockCount: 12,
    rating: 4.7,
    numReviews: 19,
    isFeatured: true,
    hasVariations: true,
    variations: [
      { name: 'Size', options: ['Medium (Loose)', 'Large', 'Extra Large'] },
      { name: 'Color', options: ['Vintage Camel', 'Forest Green', 'Chocolate Brown'] },
    ],
    variants: [
      { name: 'Medium (Loose)', value: 'Medium (Loose)', price: 850, priceAdjustment: 0, stock: 4 },
      { name: 'Large', value: 'Large', price: 850, priceAdjustment: 0, stock: 5 },
      { name: 'Extra Large', value: 'Extra Large', price: 900, priceAdjustment: 50, stock: 3 },
    ],
    hasAddOns: false,
    addOns: [],
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    name: 'Nike Retro Sports Windbreaker',
    description: 'Lightweight weather-resistant sports jacket. Zippered pockets, drawstring hood, and breathable mesh lining. Excellent condition.',
    category: 'Mitumba (Thrift Clothes)',
    categorySlug: 'mitumba-thrift-clothes',
    subcategory: 'Fashion',
    price: 700,
    originalPrice: 950,
    deliveryFee: 0,
    condition: 'Second-hand',
    brand: 'Nike Vintage',
    stock: 8,
    stockCount: 8,
    rating: 4.8,
    numReviews: 24,
    hasVariations: true,
    variations: [
      { name: 'Size', options: ['Medium', 'Large'] },
      { name: 'Color', options: ['Navy Blue / White', 'Classic Black'] },
    ],
    hasAddOns: false,
    addOns: [],
    images: [
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80',
    ],
  },

  // ── Gas Refill ─────────────────────────────────────────────────────────────
  {
    name: '6kg Total Gas Refill & Exchange',
    description: 'Instant 6kg cylinder exchange. Verified safety seal and accurate weight check at your hostel door. Rapid boda delivery across Kesses & Stage.',
    category: 'Gas Refill',
    categorySlug: 'gas-refill',
    subcategory: 'Gas Refill',
    price: 1450,
    originalPrice: 1600,
    deliveryFee: 0,
    condition: 'New',
    brand: 'TotalEnergies',
    stock: 35,
    stockCount: 35,
    rating: 5.0,
    numReviews: 92,
    isFeatured: true,
    hasVariations: false,
    variations: [],
    hasAddOns: true,
    addOns: [
      { name: 'Standard Gas Burner Attachment', price: 450, isRequired: false },
      { name: 'Heavy-Duty Gas Grill Top', price: 350, isRequired: false },
      { name: 'Piezo Spark Gas Lighter', price: 150, isRequired: false },
    ],
    images: [
      'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    name: '13kg K-Gas Refill & Exchange',
    description: 'Full 13kg cylinder exchange for student flats and apartments. Verified tamper-proof seal and pressure test guarantee.',
    category: 'Gas Refill',
    categorySlug: 'gas-refill',
    subcategory: 'Gas',
    price: 3100,
    originalPrice: 3350,
    deliveryFee: 0,
    condition: 'New',
    brand: 'K-Gas',
    stock: 15,
    stockCount: 15,
    rating: 4.9,
    numReviews: 31,
    hasVariations: false,
    variations: [],
    hasAddOns: true,
    addOns: [
      { name: 'Regulator & 1.5m Hose Pipe Set', price: 850, isRequired: false },
    ],
    images: [
      'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    ],
  },

  // ── Tech & Gadgets ─────────────────────────────────────────────────────────
  {
    name: 'Oraimo 20,000mAh 20W Fast Charge Power Bank',
    description: 'High-capacity dual-output power bank with multi-protection safety system and LED battery percentage indicator. Charges phones up to 4-5 times.',
    category: 'Tech & Gadgets',
    categorySlug: 'tech-gadgets',
    subcategory: 'Electronics',
    price: 2400,
    originalPrice: 2800,
    deliveryFee: 0,
    condition: 'New',
    brand: 'Oraimo',
    stock: 25,
    stockCount: 25,
    rating: 4.9,
    numReviews: 64,
    isFeatured: true,
    hasVariations: true,
    variations: [
      { name: 'Color', options: ['Matte Black', 'Polar White'] },
    ],
    variants: [
      { name: 'Matte Black', value: 'Matte Black', price: 2400, stock: 15 },
      { name: 'Polar White', value: 'Polar White', price: 2400, stock: 10 },
    ],
    hasAddOns: true,
    addOns: [
      { name: 'Braided Type-C Fast Cable (1m)', price: 200, isRequired: false },
      { name: 'Shockproof Velvet Storage Pouch', price: 150, isRequired: false },
    ],
    images: [
      'https://images.unsplash.com/photo-1609592424364-772b834e0622?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    name: '65W Braided Fast-Charging Type-C Cable (2M)',
    description: 'Ultra-durable nylon braided fast charging and high-speed data sync cable. Supports PD 3.0 up to 65W for laptops and smartphones.',
    category: 'Tech & Gadgets',
    categorySlug: 'tech-gadgets',
    subcategory: 'Repairs & Accessories',
    price: 450,
    originalPrice: 600,
    deliveryFee: 0,
    condition: 'New',
    brand: 'Baseus',
    stock: 40,
    stockCount: 40,
    rating: 4.8,
    numReviews: 38,
    hasVariations: true,
    variations: [
      { name: 'Length', options: ['1 Meter', '2 Meters'] },
      { name: 'Color', options: ['Midnight Black', 'Sport Red'] },
    ],
    variants: [
      { name: '1 Meter', value: '1 Meter', price: 350, priceAdjustment: -100, stock: 20 },
      { name: '2 Meters', value: '2 Meters', price: 450, priceAdjustment: 0, stock: 20 },
    ],
    hasAddOns: false,
    addOns: [],
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    ],
  },
];

async function seedDatabase() {
  console.log('⚡ [Olafasta Seed] Connecting to MongoDB:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ [Olafasta Seed] Connected to database');

    // 1. Ensure or create a sample campus vendor user
    let vendor = await User.findOne({ email: 'vendor@olafasta.com' });
    if (!vendor) {
      vendor = await User.create({
        name: 'Moi Campus Food & Tech Hub',
        email: 'vendor@olafasta.com',
        phone: '0712345678',
        password: 'password123',
        role: 'business',
        isVerified: true,
        accountActive: true,
        businessProfile: {
          businessName: 'Moi Campus Super-Vendors',
          campusLocation: 'Stage / Mabs',
          businessCategory: 'Food & Drinks',
          description: 'Official verified campus super-store for meals, electronics, thrift clothes and gas refills.',
        },
      });
      console.log('✓ [Olafasta Seed] Created sample campus vendor:', vendor.email);
    } else {
      console.log('✓ [Olafasta Seed] Using existing campus vendor:', vendor.email);
    }

    // 2. Insert or update sample products
    let createdCount = 0;
    let updatedCount = 0;

    for (const prodData of SAMPLE_PRODUCTS) {
      // Slugify base name
      const baseSlug = prodData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if product exists by name
      let existing = await Product.findOne({ name: prodData.name });

      if (existing) {
        // Ensure slug and business are set
        if (!existing.slug) {
          const suffix = Math.random().toString(36).substring(2, 6);
          existing.slug = `${baseSlug}-${suffix}`;
        }
        existing.business = vendor._id;
        existing.category = prodData.category;
        existing.categorySlug = prodData.categorySlug;
        existing.price = prodData.price;
        existing.stock = prodData.stock;
        existing.stockCount = prodData.stockCount;
        existing.variations = prodData.variations || [];
        existing.variants = prodData.variants || [];
        existing.addOns = prodData.addOns || [];
        existing.images = prodData.images;
        existing.isActive = true;
        await existing.save();
        updatedCount++;
      } else {
        const suffix = Math.random().toString(36).substring(2, 6);
        const newProduct = new Product({
          ...prodData,
          slug: `${baseSlug}-${suffix}`,
          business: vendor._id,
          isActive: true,
        });
        await newProduct.save();
        createdCount++;
      }
    }

    console.log(
      `🎉 [Olafasta Seed] Done! Created ${createdCount} new products, updated ${updatedCount} existing products.`
    );
    console.log('⚡ Local marketplace preview is now fully stocked and ready!');
    process.exit(0);
  } catch (err) {
    console.error('❌ [Olafasta Seed] Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();
