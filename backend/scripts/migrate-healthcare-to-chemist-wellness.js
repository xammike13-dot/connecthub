import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not configured. Production migration was not executed.');
  process.exit(2);
}

await mongoose.connect(MONGODB_URI);

const oldCategoryFilter = {
  $or: [
    { category: /^health\s*care$/i },
    { category: /^healthcare$/i },
    { categorySlug: /^health(?:-|\s*)?care$/i },
  ],
};

const foundBefore = await Product.countDocuments(oldCategoryFilter);
const result = await Product.updateMany(oldCategoryFilter, {
  $set: {
    category: 'Chemist & Wellness',
    categorySlug: 'chemist-wellness',
  },
});

const remainingHealthcare = await Product.countDocuments(oldCategoryFilter);
const chemistCount = await Product.countDocuments({
  $or: [
    { category: 'Chemist & Wellness' },
    { categorySlug: 'chemist-wellness' },
  ],
});

console.log(JSON.stringify({
  foundBefore,
  successfullyMigrated: result.modifiedCount,
  matched: result.matchedCount,
  remainingHealthcare,
  chemistWellnessCount: chemistCount,
}, null, 2));

await mongoose.disconnect();
