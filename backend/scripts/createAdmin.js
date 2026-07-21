import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const createAdmin = async () => {
  // DISABLE THE SCRIPT AFTER RUNNING SUCCESSFULLY TO AVOID MISUSE
  console.warn('═══════════════════════════════════════════════════════════');
  console.warn('  SECURITY NOTICE: This script has been disabled.');
  console.warn('  The Admin user has already been created successfully.');
  console.warn('  To re-enable this script, please comment out this early exit block.');
  console.warn('═══════════════════════════════════════════════════════════');
  process.exit(0);

  /*
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI environment variable is not defined.');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const targetEmail = 'connecthub387@gmail.com';
    const targetPassword = 'Mike3870@';

    const existingUser = await User.findOne({ email: targetEmail });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`Admin with email ${targetEmail} already exists.`);
        // Ensure properties are fully verified and active
        let modified = false;
        if (!existingUser.emailVerified || !existingUser.isVerified || !existingUser.isActive || !existingUser.accountActive) {
          existingUser.emailVerified = true;
          existingUser.isVerified = true;
          existingUser.isActive = true;
          existingUser.accountActive = true;
          existingUser.setupCompleted = true;
          existingUser.onboardingCompleted = true;
          modified = true;
        }

        if (modified) {
          console.log('Ensuring admin account status is fully active and verified...');
          await existingUser.save();
          console.log('Admin status updated successfully.');
        }

        console.log(`Success: Admin user is active and ready. Email: ${targetEmail}`);
        await mongoose.disconnect();
        process.exit(0);
      } else {
        console.log(`User with email ${targetEmail} exists but has role: ${existingUser.role}. Upgrading to 'admin'...`);
        existingUser.role = 'admin';
        existingUser.password = targetPassword;
        existingUser.emailVerified = true;
        existingUser.isVerified = true;
        existingUser.isActive = true;
        existingUser.accountActive = true;
        existingUser.setupCompleted = true;
        existingUser.onboardingCompleted = true;

        await existingUser.save();
        console.log(`Success: User upgraded to 'admin' role. Email: ${targetEmail}`);
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    // No existing user, create a new admin
    console.log(`Creating new admin user with email: ${targetEmail}...`);
    const newAdmin = new User({
      name: 'ConnectHub Admin',
      email: targetEmail,
      phone: '0794603837',
      password: targetPassword,
      role: 'admin',
      emailVerified: true,
      isVerified: true,
      isActive: true,
      accountActive: true,
      setupCompleted: true,
      onboardingCompleted: true,
    });

    await newAdmin.save();
    console.log(`Success: Admin user created successfully. Email: ${targetEmail}`);

  } catch (error) {
    console.error('Error running script:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
  */
};

createAdmin();
