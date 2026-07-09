import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import VerificationToken from '../models/VerificationToken.js';
import { sendEmailVerification } from '../utils/emailService.js';
import { sendWhatsAppVerification, generateVerificationCode } from '../utils/phoneService.js';

// @desc    Send email verification code
// @route   POST /api/verification/send-email
// @access  Public
export const sendEmailVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing unused email verification tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'email',
      used: false,
    });

    // Create new verification token
    await VerificationToken.create({
      userId: user._id,
      type: 'email',
      token: code,
      expiresAt,
    });

    // Send email
    const emailResult = await sendEmailVerification(email, code);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to email',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify email code
// @route   POST /api/verification/verify-email
// @access  Public
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Find valid verification token
    const verificationToken = await VerificationToken.findOne({
      userId: user._id,
      type: 'email',
      token: code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    // Mark token as used
    verificationToken.used = true;
    await verificationToken.save();

    // Update user verification status
    user.emailVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send phone/WhatsApp verification code
// @route   POST /api/verification/send-phone
// @access  Public
export const sendPhoneVerificationCode = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check resend cooldown (60 seconds)
    if (user.phoneVerificationLastResend) {
      const timeSinceLastResend = Date.now() - user.phoneVerificationLastResend.getTime();
      if (timeSinceLastResend < 60000) {
        const remainingSeconds = Math.ceil((60000 - timeSinceLastResend) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting another code`,
          cooldownRemaining: remainingSeconds,
        });
      }
    }

    // Check maximum resend attempts (max 5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Reset resend counter if it's a new day
    if (user.phoneVerificationLastResend && user.phoneVerificationLastResend < today) {
      user.phoneVerificationResendAttempts = 0;
      await user.save();
    }
    
    const resendAttemptsToday = user.phoneVerificationResendAttempts || 0;
    if (resendAttemptsToday >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Maximum resend attempts reached. Please try again tomorrow.',
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing unused phone verification tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'phone',
      used: false,
    });

    // Create new verification token
    await VerificationToken.create({
      userId: user._id,
      type: 'phone',
      token: code,
      expiresAt,
    });

    // Update user with resend tracking
    await User.findByIdAndUpdate(user._id, {
      phoneVerificationLastResend: new Date(),
      phoneVerificationResendAttempts: resendAttemptsToday + 1,
      phoneVerificationAttempts: 0,
      phoneVerificationToken: code,
      phoneVerificationExpire: expiresAt,
    });

    // Send WhatsApp/SMS
    const phoneResult = await sendWhatsAppVerification(phone, code);
    if (!phoneResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your WhatsApp',
      devMode: phoneResult.devMode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify phone code
// @route   POST /api/verification/verify-phone
// @access  Public
export const verifyPhoneCode = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone and code are required',
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check maximum verification attempts (max 3)
    const verificationAttempts = user.phoneVerificationAttempts || 0;
    if (verificationAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
      });
    }

    // Find valid verification token
    const verificationToken = await VerificationToken.findOne({
      userId: user._id,
      type: 'phone',
      token: code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationToken) {
      // Increment attempt counter
      await User.findByIdAndUpdate(user._id, {
        phoneVerificationAttempts: verificationAttempts + 1,
      });

      const remainingAttempts = 3 - (verificationAttempts + 1);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
        remainingAttempts,
      });
    }

    // Mark token as used
    verificationToken.used = true;
    await verificationToken.save();

    // Update user verification status and reset attempts
    user.phoneVerified = true;
    user.accountActive = true;
    user.phoneVerificationAttempts = 0;
    user.phoneVerificationLastResend = null;
    await user.save();

    // Update last login for new account completion flow
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token so user can continue immediately
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });

    // Track session
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress;
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
      message: 'Phone verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        phoneVerified: user.phoneVerified,
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

// @desc    Check verification status
// @route   GET /api/verification/status
// @access  Private
export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      phoneVerified: user.phoneVerified,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
