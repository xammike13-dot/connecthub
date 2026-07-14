import User from '../models/User.js';

// @desc    Complete landlord setup
// @route   POST /api/setup/landlord
// @access  Private
export const completeLandlordSetup = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID is missing',
      });
    }

    const { profilePhoto, businessLogo } = req.body;

    // Validate that image paths are valid strings if they are provided
    if (profilePhoto !== undefined && typeof profilePhoto !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: profilePhoto must be a string url',
      });
    }
    if (businessLogo !== undefined && typeof businessLogo !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: businessLogo must be a string url',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'landlord') {
      return res.status(403).json({
        success: false,
        message: 'Only landlords can complete landlord setup',
      });
    }

    // Update user with setup data
    if (profilePhoto) {
      user.profilePhoto = profilePhoto;
    }
    if (businessLogo) {
      user.businessLogo = businessLogo;
    }

    user.setupCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Landlord setup completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        businessLogo: user.businessLogo,
        setupCompleted: user.setupCompleted,
      },
    });
  } catch (error) {
    console.error('[LANDLORD SETUP ERROR STACK]:', error.stack);

    // Mongoose ValidationError, CastError, and Duplicate Key checks
    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      errorMessage = `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = `Cast Error: Invalid value for field ${error.path}`;
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate Key Error: Unique constraint violated';
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Failed to complete setup.' : errorMessage,
      error: errorMessage,
      stack: error.stack,
    });
  }
};

// @desc    Complete business setup
// @route   POST /api/setup/business
// @access  Private
export const completeBusinessSetup = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID is missing',
      });
    }

    const { profilePhoto, businessLogo } = req.body;

    if (profilePhoto !== undefined && typeof profilePhoto !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: profilePhoto must be a string url',
      });
    }
    if (businessLogo !== undefined && typeof businessLogo !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: businessLogo must be a string url',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'business') {
      return res.status(403).json({
        success: false,
        message: 'Only business users can complete business setup',
      });
    }

    // Update user with setup data
    if (profilePhoto) {
      user.profilePhoto = profilePhoto;
    }
    if (businessLogo) {
      user.businessLogo = businessLogo;
    }

    user.setupCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Business setup completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        businessLogo: user.businessLogo,
        setupCompleted: user.setupCompleted,
      },
    });
  } catch (error) {
    console.error('[BUSINESS SETUP ERROR STACK]:', error.stack);

    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      errorMessage = `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = `Cast Error: Invalid value for field ${error.path}`;
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate Key Error: Unique constraint violated';
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Failed to complete setup.' : errorMessage,
      error: errorMessage,
      stack: error.stack,
    });
  }
};

// @desc    Complete rider setup
// @route   POST /api/setup/rider
// @access  Private
export const completeRiderSetup = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID is missing',
      });
    }

    const { profilePhoto, motorcyclePhoto, workingArea, workingHours, ratePerKm } = req.body;

    if (profilePhoto !== undefined && typeof profilePhoto !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: profilePhoto must be a string url',
      });
    }
    if (motorcyclePhoto !== undefined && typeof motorcyclePhoto !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: motorcyclePhoto must be a string url',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can complete rider setup',
      });
    }

    // Update user with setup data
    if (profilePhoto) {
      user.profilePhoto = profilePhoto;
    }
    if (motorcyclePhoto) {
      user.riderProfile.motorcycle.photo = motorcyclePhoto;
    }
    if (workingArea) {
      user.riderProfile.workingArea = workingArea;
    }
    if (workingHours) {
      user.riderProfile.workingHours = workingHours;
    }
    if (ratePerKm) {
      user.riderProfile.dayRatePerKm = ratePerKm;
      user.riderProfile.nightRatePerKm = ratePerKm;
    }

    user.setupCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Rider setup completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        riderProfile: user.riderProfile,
        setupCompleted: user.setupCompleted,
      },
    });
  } catch (error) {
    console.error('[RIDER SETUP ERROR STACK]:', error.stack);

    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      errorMessage = `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = `Cast Error: Invalid value for field ${error.path}`;
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate Key Error: Unique constraint violated';
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Failed to complete setup.' : errorMessage,
      error: errorMessage,
      stack: error.stack,
    });
  }
};

// @desc    Mark onboarding as completed
// @route   POST /api/setup/onboarding-complete
// @access  Private
export const completeOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.onboardingCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get setup status
// @route   GET /api/setup/status
// @access  Private
export const getSetupStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
      role: user.role,
      profilePhoto: user.profilePhoto,
      businessLogo: user.businessLogo,
      riderProfile: user.riderProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
