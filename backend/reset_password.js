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

// Simple schema for password reset (minimal fields)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = 'xammike13@gmail.com';
    const newPassword = '623743';
    
    console.log(`=== PASSWORD RESET FOR ${email} ===`);
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('User found:', user.email);
    console.log('Current password hash:', user.password);
    
    // Hash the new password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly in database
    await User.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password reset successfully');
    console.log('New password hash:', hashedPassword);
    
    // Test the new password
    const isMatch = await bcrypt.compare(newPassword, hashedPassword);
    console.log('Password verification test:', isMatch ? 'SUCCESS' : 'FAILED');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

resetPassword();