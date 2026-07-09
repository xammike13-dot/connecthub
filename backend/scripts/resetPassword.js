import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const resetPassword = async () => {
  try {
    console.log('Connecting to database...');
    
    const user = await User.findOne({
      email: 'xammike13@gmail.com'
    });

    if (!user) {
      console.log('User not found with email: xammike13@gmail.com');
      process.exit(1);
    }

    console.log('User found:', user.email);
    console.log('Current password hash length:', user.password?.length);

    // Reset password to plain text - the pre-save middleware will hash it
    user.password = '623743';
    
    console.log('Saving user with new password...');
    await user.save();
    
    console.log('Password reset successfully!');
    console.log('New password: 623743');
    console.log('New password hash length:', user.password?.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
};

resetPassword();
