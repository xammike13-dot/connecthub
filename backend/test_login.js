import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Simple schema for testing
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = 'xammike13@gmail.com';
    const password = '623743';
    
    console.log(`=== TESTING LOGIN FOR ${email} ===`);
    console.log('Password:', password);
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('User found:', user.email);
    console.log('User active:', user.isActive);
    console.log('User deleted:', user.isDeleted);
    console.log('Password hash:', user.password);
    
    // Test password match
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch ? 'SUCCESS' : 'FAILED');
    
    if (isMatch) {
      console.log('✅ LOGIN SHOULD WORK WITH PASSWORD: 623743');
    } else {
      console.log('❌ LOGIN WILL FAIL');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

testLogin();