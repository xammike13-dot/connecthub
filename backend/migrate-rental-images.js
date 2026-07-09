/**
 * Migration Script: Convert Rental Images from String Arrays to Object Arrays
 * 
 * This script migrates existing rental data from the old image format:
 *   images: ["https://cloudinary.com/..."]
 * 
 * To the new format:
 *   images: [{ url: "https://cloudinary.com/...", publicId: null }]
 * 
 * Run this script from the backend directory:
 *   node migrate-rental-images.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Rental schema (simplified for migration)
const rentalSchema = new mongoose.Schema({
  rentalName: String,
  images: [mongoose.Schema.Types.Mixed],
});

const Rental = mongoose.model('Rental', rentalSchema);

async function migrateImages() {
  try {
    console.log('[MIGRATION] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[MIGRATION] Connected to MongoDB');

    // Find all rentals
    console.log('[MIGRATION] Fetching all rentals...');
    const rentals = await Rental.find({});
    console.log(`[MIGRATION] Found ${rentals.length} rentals`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const rental of rentals) {
      try {
        const { _id, rentalName, images } = rental;

        // Skip if no images
        if (!images || images.length === 0) {
          console.log(`[MIGRATION] Skipped "${rentalName}" (no images)`);
          skippedCount++;
          continue;
        }

        // Check if images need migration
        const needsMigration = images.some(img => typeof img === 'string');

        if (!needsMigration) {
          console.log(`[MIGRATION] Skipped "${rentalName}" (already in new format)`);
          skippedCount++;
          continue;
        }

        // Convert images to new format
        const newImages = images.map(img => {
          if (typeof img === 'string') {
            return { url: img, publicId: null };
          }
          return img;
        });

        // Update rental
        await Rental.findByIdAndUpdate(_id, { images: newImages });
        console.log(`[MIGRATION] Migrated "${rentalName}" - ${images.length} images`);
        migratedCount++;

      } catch (error) {
        console.error(`[MIGRATION] Error migrating rental ${rental._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n[MIGRATION] Summary:');
    console.log(`  - Migrated: ${migratedCount} rentals`);
    console.log(`  - Skipped: ${skippedCount} rentals`);
    console.log(`  - Errors: ${errorCount} rentals`);
    console.log('\n[MIGRATION] Migration complete');

  } catch (error) {
    console.error('[MIGRATION] Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION] Disconnected from MongoDB');
  }
}

// Run migration
migrateImages();
