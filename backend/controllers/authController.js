import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import VerificationToken from '../models/VerificationToken.js';
import { generateVerificationCode } from '../utils/phoneService.js';
import { 
  sendVerificationEmail, 
  sendWelcomeEmail 
} from '../services/emailService.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Helper function to handle successful login
const handleLoginSuccess = async (user, password, req, res) => {
  console.log('[PASSWORD FIELD EXISTS]', !!user?.password);
  console.log('[USER ACTIVE]', user?.isActive);
  console.log('[USER DELETED]', user?.isDeleted);
  console.log('[PASSWORD HASH]', user?.password);
  console.log('[PASSWORD PROVIDED]', password);

  // Check password
  const isMatch = await user.matchPassword(password);
  console.log('[PASSWORD MATCH]', isMatch);
  console.log('[BCRYPT COMPARE DETAILS]', {
    plainPassword: password,
    storedHash: user.password,
    match: isMatch
  });
  
  if (!isMatch) {
    console.log('[LOGIN FAILED] Password mismatch for email:', user.email);
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check email verification status - users must verify email before logging in
  if (!user.emailVerified) {
    console.log('[LOGIN FAILED] Email not verified for:', user.email);
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in.',
      requiresVerification: true,
      emailVerified: user.emailVerified,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  }

  // Update last login (use findByIdAndUpdate to avoid password re-hashing)
  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  // Create token
  const token = generateToken(user._id);

  // Track session
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress;
  
  // Simple device/browser detection
  let device = 'Unknown';
  let browser = 'Unknown';
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';
  else device = 'Desktop';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  await User.findByIdAndUpdate(user._id, {
    $push: {
      sessions: {
        token,
        device,
        browser,
        ip,
        loginTime: new Date(),
        lastActive: new Date(),
      }
    }
  });

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      withdrawalNumber: user.withdrawalNumber,
      emailVerified: user.emailVerified,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user with verification fields (pending/unverified state)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'customer',
      emailVerified: false,
      isActive: false, // Account is not active until email is verified
      setupCompleted: false,
      onboardingCompleted: false,
    });

    // Create wallet for the user (for all roles)
    await Wallet.create({
      user: user._id,
    });

    // Generate email verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing unused email verification tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'email',
      used: false,
    });

    // Create verification token
    await VerificationToken.create({
      userId: user._id,
      type: 'email',
      token: code,
      expiresAt,
    });

    // Update user with verification token info
    user.emailVerificationToken = code;
    user.emailVerificationExpire = expiresAt;
    await user.save();

    // Send verification email using Brevo
    const emailResult = await sendVerificationEmail(email, code);

    if (!emailResult.success) {
      console.error('[REGISTER] Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails - user can resend
    }

    // Do NOT create token or auto-login
    // User must verify email first
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email address.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      devMode: emailResult.devMode,
    });
  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('[LOGIN REQUEST]', req.body);

    // Validate email & password
    if (!email || !password) {
      console.log('[LOGIN VALIDATION FAILED] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user (case-insensitive due to schema lowercase: true)
    const user = await User.findOne({ email }).select('+password');
    console.log('[USER FOUND]', !!user);
    console.log('[USER EMAIL]', user?.email);
    console.log('[SEARCH EMAIL]', email);
    
    // Fallback to case-insensitive search if exact match fails
    if (!user) {
      console.log('[EXACT MATCH FAILED, TRYING CASE-INSENSITIVE]');
      const caseInsensitiveUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      }).select('+password');
      console.log('[CASE-INSENSITIVE USER FOUND]', !!caseInsensitiveUser);
      if (caseInsensitiveUser) {
        console.log('[FOUND EMAIL]', caseInsensitiveUser.email);
        return handleLoginSuccess(caseInsensitiveUser, password, req, res);
      }
    }
    
    if (!user) {
      console.log('[LOGIN FAILED] User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    return handleLoginSuccess(user, password, req, res);
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.emailVerified,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        withdrawalNumber: user.withdrawalNumber,
        sessions: user.sessions,
        riderProfile: user.riderProfile,
        businessProfile: user.businessProfile,
        landlordProfile: user.landlordProfile,
        customerProfile: user.customerProfile,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, avatar, withdrawalNumber } = req.body;

    // Check if email is being changed and if it already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (withdrawalNumber !== undefined) updateData.withdrawalNumber = withdrawalNumber;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        withdrawalNumber: user.withdrawalNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    // Create token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
export const logoutAllDevices = async (req, res, next) => {
  try {
    // Clear all sessions using findByIdAndUpdate to avoid password re-hashing
    await User.findByIdAndUpdate(req.user.id, { sessions: [] });

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Deactivate account
// @route   POST /api/auth/deactivate
// @access  Private
export const deactivateAccount = async (req, res, next) => {
  try {
    // Deactivate account using findByIdAndUpdate to avoid password re-hashing
    await User.findByIdAndUpdate(req.user.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    // Soft delete using findByIdAndUpdate to avoid password re-hashing
    await User.findByIdAndUpdate(req.user.id, {
      isDeleted: true,
      isActive: false,
      email: `${user.email}_deleted_${Date.now()}`,
      phone: `${user.phone}_deleted_${Date.now()}`,
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Forgot password - send reset code
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (!user) {
      // For security, don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.',
      });
    }

    // Generate reset code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing unused password reset tokens
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'password_reset',
      used: false,
    });

    // Create new reset token
    await VerificationToken.create({
      userId: user._id,
      type: 'password_reset',
      token: code,
      expiresAt,
    });

    // Send reset email
    const emailResult = await sendPasswordResetEmail(email, code);

    if (!emailResult.success) {
      console.error('[FORGOT PASSWORD] Failed to send reset email:', emailResult.error);
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
      devMode: emailResult.devMode,
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset password with code
// @route   POST /api/auth/resetpassword
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset code, and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Find user
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code',
      });
    }

    // Find valid reset token
    const resetToken = await VerificationToken.findOne({
      userId: user._id,
      type: 'password_reset',
      token: code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
    }

    // Mark token as used
    resetToken.used = true;
    await resetToken.save();

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(email);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Debug login endpoint
// @route   GET /api/auth/debug/test-login/:email
// @access  Public (debug only)
export const debugLogin = async (req, res, next) => {
  try {
    const { email } = req.params;
    
    console.log('[DEBUG LOGIN REQUEST]', { email });
    
    const user = await User.findOne({ email }).select('+password');
    
    const response = {
      email,
      userFound: !!user,
      hasPassword: !!user?.password,
      passwordLength: user?.password?.length,
      passwordHash: user?.password,
      isActive: user?.isActive,
      isDeleted: user?.isDeleted,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      emailVerified: user?.emailVerified
    };
    
    console.log('[DEBUG LOGIN RESPONSE]', response);
    
    res.status(200).json(response);
  } catch (error) {
    console.error('[DEBUG LOGIN ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};