import User from '../models/User.js';

// Check if user has verified at least one of email or phone
export const requireVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.emailVerified && !user.phoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email and phone number to continue',
        requiresVerification: true,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Check if user has completed setup
export const requireSetup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.setupCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your account setup',
        requiresSetup: true,
        role: user.role,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Check if user has completed onboarding
export const requireOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete the onboarding walkthrough',
        requiresOnboarding: true,
        role: user.role,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
