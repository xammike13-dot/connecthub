import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  try {
    console.log('Connecting to database...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    const db = conn.connection.db;
    const collections = await db.listCollections({ name: 'transactions' }).toArray();
    if (collections.length > 0) {
      const indexes = await db.collection('transactions').indexes();
      console.log('Current indexes on transactions collection:', indexes);

      const hasRelatedEntityUniqueIndex = indexes.some(idx => idx.name === 'relatedEntity_1' && idx.unique);
      if (hasRelatedEntityUniqueIndex) {
        console.log('Found unique index "relatedEntity_1". Dropping it...');
        await db.collection('transactions').dropIndex('relatedEntity_1');
        console.log('Unique index "relatedEntity_1" dropped successfully.');
      } else {
        console.log('No unique index "relatedEntity_1" found.');
      }
    } else {
      console.log('Collection "transactions" does not exist.');
    }
  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

run();
