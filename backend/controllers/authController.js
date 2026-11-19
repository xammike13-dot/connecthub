import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import VerificationToken from '../models/VerificationToken.js';
import SystemLog from '../models/SystemLog.js';
import { generateVerificationCode } from '../utils/phoneService.js';
import { hashEmailVerificationCode } from '../utils/emailVerification.js';
import { 
  sendWelcomeEmail,
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPasswordResetConfirmation
} from '../services/emailService.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Helper function to handle successful login
const handleLoginSuccess = async (user, password, req, res) => {
  // Check password
  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    // Log auth failure
    SystemLog.create({
      type: 'auth_failure',
      message: 'Failed login attempt (password mismatch)',
      details: { ip: req.ip || req.connection.remoteAddress },
      user: user._id
    }).catch(e => console.error('Failed to log SystemLog auth mismatch:', e.message));

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check email verification status - users must verify email before logging in
  if (!user.emailVerified && user.role !== 'customer') {
    // Log email unverified
    SystemLog.create({
      type: 'auth_failure',
      message: 'Failed login attempt (email unverified)',
      details: { ip: req.ip || req.connection.remoteAddress },
      user: user._id
    }).catch(e => console.error('Failed to log SystemLog email unverified:', e.message));

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
      roleApplication: user.roleApplication,
    },
  });
};

// @desc    Register user (Customer-First Onboarding)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    const email = typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

    // 1. Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your full name',
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email address',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your phone number',
      });
    }

    // Validate and normalize Kenyan phone number
    const cleanedPhone = phone.trim().replace(/\D/g, '');
    let normalizedPhone = cleanedPhone;
    if (cleanedPhone.startsWith('0')) {
      normalizedPhone = '254' + cleanedPhone.substring(1);
    } else if (cleanedPhone.length === 9 && (cleanedPhone.startsWith('7') || cleanedPhone.startsWith('1'))) {
      normalizedPhone = '254' + cleanedPhone;
    }

    if (!/^254(7\d{8}|1\d{8})$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Kenyan phone number (e.g., 07XX XXX XXX or 01XX XXX XXX)',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // 2. Check for duplicate email cleanly
    const existingEmailUser = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isDeleted: { $ne: true },
    });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in instead.',
      });
    }

    // 3. Check for duplicate phone cleanly
    const existingPhoneUser = await User.findOne({
      phone: { $in: [phone.trim(), normalizedPhone, '0' + normalizedPhone.substring(3)] },
      isDeleted: { $ne: true },
    });
    if (existingPhoneUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this phone number already exists. Please log in instead.',
      });
    }

    // 4. Create user - strictly hardcoding role: 'customer' (ignores any requested role to prevent privilege-escalation)
    const user = await User.create({
      name: name.trim(),
      email,
      phone: phone.trim(),
      password,
      role: 'customer',
      emailVerified: true,
      isActive: true,
      accountActive: true,
      isVerified: true,
      setupCompleted: true,
      onboardingCompleted: true,
    });

    // Create user wallet
    try {
      await Wallet.create({ user: user._id });
    } catch (walletErr) {
      console.warn('[REGISTER] Wallet initialization warning:', walletErr.message);
    }

    // 5. Generate JWT immediately so user is authenticated without friction
    const token = generateToken(user._id);

    // 6. Non-blocking automated Welcome Email dispatch
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.warn('[REGISTER] Welcome email delivery notice:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Olafasta.',
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || '',
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'email';
      return res.status(409).json({
        success: false,
        message: `An account with this ${field} already exists. Please sign in instead.`,
      });
    }
    console.error('[REGISTER ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed. Please try again.',
    });
  }
};

export const login = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    const { password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user (case-insensitive due to schema lowercase: true)
    const user = await User.findOne({ email }).select('+password');
    
    // Fallback to case-insensitive search if exact match fails
    if (!user) {
      const caseInsensitiveUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      }).select('+password');
      if (caseInsensitiveUser) {
        return handleLoginSuccess(caseInsensitiveUser, password, req, res);
      }
    }
    
    if (!user) {
      // Log auth failure (non-existent user)
      SystemLog.create({
        type: 'auth_failure',
        message: 'Failed login attempt (user not found)',
        details: { ip: req.ip || req.headers['x-forwarded-for'] || null }
      }).catch(e => console.error('Failed to log SystemLog auth mismatch:', e.message));

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
        setupCompleted: user.setupCompleted,
        onboardingCompleted: user.onboardingCompleted,
        roleApplication: user.roleApplication,
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
        setupCompleted: user.setupCompleted,
        onboardingCompleted: user.onboardingCompleted,
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

    // Check if user is locked out from password resets
    if (user.passwordResetLockoutUntil && user.passwordResetLockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.passwordResetLockoutUntil - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Too many failed attempts. Please try again after ${remainingMinutes} minute(s).`,
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
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;

      if (user.passwordResetAttempts >= 5) {
        // Set lockout for 15 minutes
        user.passwordResetLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.passwordResetAttempts = 0; // Reset counter for next cycle

        // Invalidate current password reset tokens
        await VerificationToken.deleteMany({
          userId: user._id,
          type: 'password_reset',
          used: false,
        });

        await user.save();

        return res.status(403).json({
          success: false,
          message: 'Too many failed attempts. Password reset is locked. Please request a new password reset link or code after 15 minutes.',
        });
      }

      await user.save();

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
    user.passwordResetAttempts = 0;
    user.passwordResetLockoutUntil = undefined;
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

