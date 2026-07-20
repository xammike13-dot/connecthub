import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Mongoose 6+ no longer requires useNewUrlParser and useUnifiedTopology
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Safely drop the obsolete unique index 'relatedEntity_1' on transactions collection
    try {
      const db = conn.connection.db;
      const collections = await db.listCollections({ name: 'transactions' }).toArray();
      if (collections.length > 0) {
        const indexes = await db.collection('transactions').indexes();
        const hasRelatedEntityUniqueIndex = indexes.some(idx => idx.name === 'relatedEntity_1' && idx.unique);
        if (hasRelatedEntityUniqueIndex) {
          console.log('[Database] Found obsolete unique index "relatedEntity_1" on "transactions" collection. Dropping it...');
          await db.collection('transactions').dropIndex('relatedEntity_1');
          console.log('[Database] Obsolete unique index "relatedEntity_1" dropped successfully.');
        } else {
          console.log('[Database] No obsolete unique index "relatedEntity_1" found on "transactions" collection.');
        }
      }
    } catch (indexError) {
      console.warn('[Database] Warning: Could not drop obsolete unique index on transactions collection:', indexError.message);
    }

    // Safely drop obsolete unique indexes on notifications collection
    try {
      const db = conn.connection.db;
      const notifCollections = await db.listCollections({ name: 'notifications' }).toArray();
      if (notifCollections.length > 0) {
        const indexes = await db.collection('notifications').indexes();
        for (const idx of indexes) {
          if (idx.unique && (idx.name.includes('data.rideId') || idx.name.includes('data.orderId') || idx.name.includes('data.bookingId'))) {
            console.log(`[Database] Found obsolete unique index "${idx.name}" on "notifications" collection. Dropping it...`);
            await db.collection('notifications').dropIndex(idx.name);
            console.log(`[Database] Obsolete unique index "${idx.name}" dropped successfully.`);
          }
        }
      }
    } catch (indexError) {
      console.warn('[Database] Warning: Could not drop obsolete unique indexes on notifications collection:', indexError.message);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;