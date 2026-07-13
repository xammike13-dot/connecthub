import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import VerificationToken from '../models/VerificationToken.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService.js';
import { generateVerificationCode } from '../utils/phoneService.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Resend cooldown in milliseconds (60 seconds)
const RESEND_COOLDOWN = 60 * 1000;
const MAX_RESEND_ATTEMPTS_PER_DAY = 5;

// @desc    Send email verification code
// @route   POST /api/verification/send-email
// @access  Public
export const sendEmailVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('[SEND EMAIL VERIFICATION] Received request for email:', email);

    if (!email) {
      console.log('[SEND EMAIL VERIFICATION] Validation failed - email is required');
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

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Check resend cooldown
    if (user.emailVerificationLastResend) {
      const timeSinceLastResend = Date.now() - user.emailVerificationLastResend.getTime();
      if (timeSinceLastResend < RESEND_COOLDOWN) {
        const remainingSeconds = Math.ceil((RESEND_COOLDOWN - timeSinceLastResend) / 1000);
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
    if (user.emailVerificationLastResend && user.emailVerificationLastResend < today) {
      user.emailVerificationResendAttempts = 0;
      await user.save();
    }
    
    const resendAttemptsToday = user.emailVerificationResendAttempts || 0;
    if (resendAttemptsToday >= MAX_RESEND_ATTEMPTS_PER_DAY) {
      return res.status(429).json({
        success: false,
        message: 'Maximum resend attempts reached. Please try again tomorrow.',
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

    // Update user with verification token and resend tracking
    user.emailVerificationToken = code;
    user.emailVerificationExpire = expiresAt;
    user.emailVerificationLastResend = new Date();
    user.emailVerificationResendAttempts = resendAttemptsToday + 1;
    await user.save();

    // Send email
    const emailResult = await sendVerificationEmail(email, code);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to email',
      devMode: emailResult.devMode,
    });
  } catch (error) {
    console.error('[SEND EMAIL VERIFICATION ERROR]', error);
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

    console.log('[VERIFY EMAIL] Received request:', { email, code: code ? `${code.length} digits` : undefined });

    if (!email || !code) {
      console.log('[VERIFY EMAIL] Validation failed - missing:', { hasEmail: !!email, hasCode: !!code });
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

    // Check if email is already verified
    if (user.emailVerified) {
      // Generate token and log user in
      const token = generateToken(user._id);
      
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

      return res.status(200).json({
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
          setupCompleted: user.setupCompleted,
          onboardingCompleted: user.onboardingCompleted,
        },
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

    // Update user verification status and activate account
    user.emailVerified = true;
    user.isActive = true; // Activate the account
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastResend = null;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name, user.role);

    // Generate JWT token and log user in
    const token = generateToken(user._id);

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
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: true,
        setupCompleted: user.setupCompleted,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('[VERIFY EMAIL ERROR]', error);
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
      emailVerified: user.emailVerified,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    console.error('[GET VERIFICATION STATUS ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Legacy phone verification endpoints (kept for backward compatibility but disabled)
// These are no longer used - email verification is the primary method

// @desc    Send phone verification code (DISABLED)
// @route   POST /api/verification/send-phone
// @access  Public
export const sendPhoneVerificationCode = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Phone verification is no longer supported. Please use email verification.',
  });
};

// @desc    Verify phone code (DISABLED)
// @route   POST /api/verification/verify-phone
// @access  Public
export const verifyPhoneCode = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Phone verification is no longer supported. Please use email verification.',
  });
};