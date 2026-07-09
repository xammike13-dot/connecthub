import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import VerificationToken from '../models/VerificationToken.js';
import axios from 'axios';
import { generateVerificationCode, sendWhatsAppVerification } from '../utils/phoneService.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Google OAuth login/signup
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required',
      });
    }

    // Verify Google token with Google's API
    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenId}`
    );

    const { email, name, sub: googleId, picture } = googleResponse.data;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token',
      });
    }

    // Check if user exists by email
    let user = await User.findOne({ email });

    if (user) {
      // Existing user - login
      // Check if they have Google ID linked
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }

      // Check phone verification status (only for newly created users)
      if (user.phoneVerified === false) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your phone number to continue',
          requiresVerification: true,
          phoneVerified: user.phoneVerified,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
        });
      }

      // Update last login
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

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
          avatar: user.avatar || picture,
          phoneVerified: user.phoneVerified,
          setupCompleted: user.setupCompleted,
          onboardingCompleted: user.onboardingCompleted,
        },
      });
    } else {
      // New user - signup
      // They need to provide phone number and role
      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'Please complete your registration',
        googleData: {
          email,
          name,
          googleId,
          picture,
        },
      });
    }
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Google authentication failed',
    });
  }
};

// @desc    Complete Google signup
// @route   POST /api/auth/google/complete
// @access  Public
export const completeGoogleSignup = async (req, res) => {
  try {
    const { email, name, googleId, picture, phone, role } = req.body;

    if (!email || !name || !googleId || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      role,
      googleId,
      avatar: picture,
      phoneVerified: false,
      accountActive: false,
      setupCompleted: false,
      onboardingCompleted: false,
      password: Math.random().toString(36).slice(-8), // Random password (won't be used)
    });

    // Create wallet
    await Wallet.create({
      user: user._id,
    });

    // Generate and send phone verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create verification token
    await VerificationToken.create({
      userId: user._id,
      type: 'phone',
      token: code,
      expiresAt,
    });

    // Update user with verification token
    user.phoneVerificationToken = code;
    user.phoneVerificationExpire = expiresAt;
    await user.save();

    // Send WhatsApp verification
    const phoneResult = await sendWhatsAppVerification(phone, code);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your phone number.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        phoneVerified: false,
      },
      devMode: phoneResult.devMode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
