import mongoose from 'mongoose';

let mongoMemoryServerInstance = null;

const cleanObsoleteIndexes = async (conn) => {
  // Safely drop the obsolete unique index 'relatedEntity_1' on transactions collection
  try {
    const db = conn.connection.db;
    const collections = await db.listCollections({ name: 'transactions' }).toArray();
    if (collections.length > 0) {
      const indexes = await db.collection('transactions').indexes();
      const hasRelatedEntityUniqueIndex = indexes.some(
        (idx) => idx.name === 'relatedEntity_1' && idx.unique
      );
      if (hasRelatedEntityUniqueIndex) {
        console.log('[Database] Found obsolete unique index "relatedEntity_1" on "transactions" collection. Dropping it...');
        await db.collection('transactions').dropIndex('relatedEntity_1');
        console.log('[Database] Obsolete unique index "relatedEntity_1" dropped successfully.');
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
        if (
          idx.unique &&
          (idx.name.includes('data.rideId') ||
            idx.name.includes('data.orderId') ||
            idx.name.includes('data.bookingId'))
        ) {
          console.log(`[Database] Found obsolete unique index "${idx.name}" on "notifications" collection. Dropping it...`);
          await db.collection('notifications').dropIndex(idx.name);
          console.log(`[Database] Obsolete unique index "${idx.name}" dropped successfully.`);
        }
      }
    }
  } catch (indexError) {
    console.warn('[Database] Warning: Could not drop obsolete unique indexes on notifications collection:', indexError.message);
  }
};

const seedInitialDataIfEmpty = async () => {
  try {
    const { default: User } = await import('../models/User.js');
    const { default: Product } = await import('../models/Product.js');
    const { default: Rental } = await import('../models/Rental.js');

    const defaultPassword = 'Password123!';

    // Ensure all 7 roles exist
    const rolesToSeed = [
      {
        email: 'admin@olafasta.com',
        altEmail: 'olafastaadmin@olafasta.com',
        name: 'Olafasta Platform Admin',
        phone: '0711111111',
        role: 'admin',
      },
      {
        email: 'customer@olafasta.com',
        name: 'Brian Kipkoech (Comrade)',
        phone: '0722222222',
        role: 'customer',
      },
      {
        email: 'vendor@olafasta.com',
        name: 'Kesses Electronics Hub',
        phone: '0733333333',
        role: 'business',
        businessProfile: {
          businessName: 'Kesses Electronics Hub',
          businessLocation: 'Kesses Stage, Moi University',
          businessCategory: 'Electronics & Gadgets',
          businessContact: '0733333333',
        },
      },
      {
        email: 'landlord@olafasta.com',
        name: 'Chebarus Prime Hostels',
        phone: '0744444444',
        role: 'landlord',
        landlordProfile: {
          propertyName: 'Chebarus Executive Hostels',
          propertyDescription: 'Modern, secure comrades residences at Chebarus corridor with free high-speed WiFi and 24/7 borehole water.',
          propertyLocation: 'Chebarus, Moi University',
          contactDetails: '0744444444',
          totalProperties: 1,
        },
      },
      {
        email: 'rider@olafasta.com',
        name: 'Kamau Boda Fasta',
        phone: '0755555555',
        role: 'rider',
        riderProfile: {
          workingArea: {
            county: 'Uasin Gishu',
            town: 'Eldoret - Kesses',
            serviceRadius: '10km',
            selectedWorkingAreas: ['Kesses', 'Chebarus', 'Mabs', 'Stage'],
          },
          dayRatePerKm: 50,
          nightRatePerKm: 70,
          motorcycle: {
            brand: 'Boxer',
            model: 'BM 150',
            plateNumber: 'KMDF 123X',
            color: 'Red',
            year: 2023,
          },
          isAvailable: true,
          isOnline: true,
        },
      },
      {
        email: 'caretaker@olafasta.com',
        name: 'Chebarus Caretaker',
        phone: '0766666666',
        role: 'caretaker',
        caretakerProfile: {
          status: 'active',
          addedAt: new Date(),
        },
      },
      {
        email: 'assistant@olafasta.com',
        name: 'Kesses Store Assistant',
        phone: '0777777777',
        role: 'assistant',
        assistantProfile: {
          status: 'active',
          addedAt: new Date(),
        },
      },
    ];

    let businessUser = null;
    let landlordUser = null;

    for (const item of rolesToSeed) {
      let existing = await User.findOne({ email: item.email });
      if (!existing) {
        const created = await User.create({
          name: item.name,
          email: item.email,
          password: defaultPassword,
          phone: item.phone,
          role: item.role,
          emailVerified: true,
          isVerified: true,
          isActive: true,
          accountActive: true,
          setupCompleted: true,
          onboardingCompleted: true,
          businessProfile: item.businessProfile,
          landlordProfile: item.landlordProfile,
          riderProfile: item.riderProfile,
          caretakerProfile: item.caretakerProfile,
          assistantProfile: item.assistantProfile,
        });

        if (item.altEmail) {
          const existingAlt = await User.findOne({ email: item.altEmail });
          if (!existingAlt) {
            await User.create({
              name: item.name,
              email: item.altEmail,
              password: defaultPassword,
              phone: '0711111112',
              role: 'admin',
              emailVerified: true,
              isVerified: true,
              isActive: true,
              accountActive: true,
              setupCompleted: true,
              onboardingCompleted: true,
            });
          }
        }

        if (item.role === 'business') businessUser = created;
        if (item.role === 'landlord') landlordUser = created;
      } else {
        existing.password = defaultPassword;
        existing.emailVerified = true;
        existing.isVerified = true;
        existing.isActive = true;
        existing.accountActive = true;
        existing.setupCompleted = true;
        existing.onboardingCompleted = true;
        if (item.businessProfile) existing.businessProfile = item.businessProfile;
        if (item.landlordProfile) existing.landlordProfile = item.landlordProfile;
        if (item.riderProfile) existing.riderProfile = item.riderProfile;
        if (item.caretakerProfile) existing.caretakerProfile = item.caretakerProfile;
        if (item.assistantProfile) existing.assistantProfile = item.assistantProfile;
        await existing.save();

        if (item.role === 'business') businessUser = existing;
        if (item.role === 'landlord') landlordUser = existing;
      }
    }

    // Caretaker (linked to Landlord)
    if (landlordUser) {
      const existingCaretaker = await User.findOne({ email: 'caretaker@olafasta.com' });
      if (!existingCaretaker) {
        await User.create({
          name: 'Chebarus Caretaker',
          email: 'caretaker@olafasta.com',
          password: defaultPassword,
          phone: '0766666666',
          role: 'caretaker',
          emailVerified: true,
          isVerified: true,
          isActive: true,
          accountActive: true,
          setupCompleted: true,
          onboardingCompleted: true,
          caretakerProfile: {
            landlord: landlordUser._id,
            status: 'active',
            addedAt: new Date(),
          },
        });
      }

      // Seed starter rental property if empty
      const rentalCount = await Rental.countDocuments();
      if (rentalCount === 0) {
        await Rental.create({
          landlord: landlordUser._id,
          rentalName: 'Chebarus Executive Bed-Sitter',
          rentalType: 'bedsitter',
          monthlyPrice: 4500,
          location: 'cheba',
          amenities: ['wifi', 'security', 'balcony'],
          description: 'Spacious bed-sitter with tiled floor, constant borehole water, and high-speed comrade Wi-Fi. 5 minutes walk to Moi University Main Gate.',
          images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500'],
          isAvailable: true,
        });
      }
    }

    // Assistant (linked to Business)
    if (businessUser) {
      let existingAssistant = await User.findOne({ email: 'assistant@olafasta.com' });
      if (!existingAssistant) {
        await User.create({
          name: 'Kesses Store Assistant',
          email: 'assistant@olafasta.com',
          password: defaultPassword,
          phone: '0777777777',
          role: 'assistant',
          emailVerified: true,
          isVerified: true,
          isActive: true,
          accountActive: true,
          setupCompleted: true,
          onboardingCompleted: true,
          assistantProfile: {
            business: businessUser._id,
            status: 'active',
            addedAt: new Date(),
          },
        });
      } else {
        existingAssistant.password = defaultPassword;
        existingAssistant.emailVerified = true;
        existingAssistant.isVerified = true;
        existingAssistant.setupCompleted = true;
        await existingAssistant.save();
      }

      // Seed starter product if empty
      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        await Product.create({
          business: businessUser._id,
          name: 'Type-C Fast Charging Cable 65W',
          description: 'Heavy duty braided fast-charging USB-C to USB-C cable. Perfect for student laptops and smartphones.',
          price: 350,
          businessCategory: 'Electronics & Gadgets',
          category: 'Repairs & Accessories',
          subcategory: 'Repairs & Accessories',
          images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500'],
          stock: 45,
          views: 32,
          isActive: true,
        });
      }
    }

    console.log('[Database] ✅ Default Olafasta accounts verified & ready for all dashboards.');
  } catch (seedErr) {
    console.warn('[Database] Warning during initial seed:', seedErr.message);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/olafasta';
  const isDev = (process.env.NODE_ENV || 'development') !== 'production';
  const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('::1');

  try {
    // Attempt standard connection (with 3s timeout for localhost so dev mode doesn't hang)
    const connectOptions = isLocalhost ? { serverSelectionTimeoutMS: 3000 } : {};
    const conn = await mongoose.connect(uri, connectOptions);

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    await cleanObsoleteIndexes(conn);
    await seedInitialDataIfEmpty();
    return conn;
  } catch (error) {
    // In development mode, if local MongoDB is offline, seamlessly start MongoMemoryServer
    const isConnRefused =
      error.message?.includes('ECONNREFUSED') ||
      error.name === 'MongooseServerSelectionError';

    if (isDev && isLocalhost && isConnRefused) {
      console.warn(`[Database] ⚠️ Local MongoDB server is not running on ${uri}`);
      console.log('[Database] ⚡ Launching in-memory MongoDB (MongoMemoryServer) for local development...');

      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoMemoryServerInstance = await MongoMemoryServer.create();
        const memUri = mongoMemoryServerInstance.getUri();

        const conn = await mongoose.connect(memUri);
        console.log(`[Database] ✅ Connected to in-memory MongoDB: ${memUri}`);

        await cleanObsoleteIndexes(conn);
        await seedInitialDataIfEmpty();

        const cleanUp = async () => {
          if (mongoMemoryServerInstance) {
            try {
              await mongoose.disconnect();
              await mongoMemoryServerInstance.stop();
            } catch (_) {}
          }
        };

        process.once('SIGINT', cleanUp);
        process.once('SIGTERM', cleanUp);

        return conn;
      } catch (memErr) {
        console.error('[Database] Failed to start in-memory MongoDB fallback:', memErr);
        process.exit(1);
      }
    }

    console.error(`[Database] Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
