import User from '../models/User.js';

// Helper function to handle Mongoose and other errors consistently
const handleControllerError = (error, res, genericMessage) => {
  console.error(error.stack || error);

  const isDev = process.env.NODE_ENV !== 'production';

  // Handle Mongoose ValidationError
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: isDev ? `Validation Error: ${messages.join(', ')}` : 'Failed to complete setup due to a validation error.',
      error: isDev ? error.message : undefined,
    });
  }

  // Handle Mongoose CastError
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: isDev ? `Cast Error: Invalid ${error.path} value` : 'Failed to complete setup due to an invalid field format.',
      error: isDev ? error.message : undefined,
    });
  }

  // Handle duplicate key error (E11000)
  if (error.code === 11000) {
    const fields = Object.keys(error.keyValue || {}).join(', ');
    return res.status(409).json({
      success: false,
      message: isDev ? `Duplicate field value error for fields: ${fields}` : 'Failed to complete setup. Duplicate data detected.',
      error: isDev ? error.message : undefined,
    });
  }

  return res.status(500).json({
    success: false,
    message: isDev ? error.message : genericMessage,
  });
};

// @desc    Complete landlord setup
// @route   POST /api/setup/landlord
// @access  Private
export const completeLandlordSetup = async (req, res) => {
  try {
    const { profilePhoto, businessLogo } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. User credentials missing.',
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'landlord') {
      return res.status(403).json({
        success: false,
        message: 'Only landlords can complete landlord setup',
      });
    }

    // Validate that image paths are valid strings before saving
    if (profilePhoto !== undefined && profilePhoto !== null && profilePhoto !== '') {
      if (typeof profilePhoto !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo must be a valid string.',
        });
      }
      user.profilePhoto = profilePhoto;
      user.avatar = profilePhoto;
    }
    if (businessLogo !== undefined && businessLogo !== null) {
      if (typeof businessLogo !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Business logo must be a valid string.',
        });
      }
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
    handleControllerError(error, res, 'Failed to complete setup.');
  }
};

// @desc    Complete business setup
// @route   POST /api/setup/business
// @access  Private
export const completeBusinessSetup = async (req, res) => {
  try {
    const { businessLogo } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. User credentials missing.',
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'business') {
      return res.status(403).json({
        success: false,
        message: 'Only business users can complete business setup',
      });
    }

    // Validate and save the business logo to multiple fields to ensure it is displayed everywhere automatically
    if (businessLogo !== undefined && businessLogo !== null) {
      if (typeof businessLogo !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Business logo must be a valid string.',
        });
      }
      user.businessLogo = businessLogo;
      user.avatar = businessLogo;

      // Initialize businessProfile and set the nested businessLogo
      user.businessProfile = user.businessProfile || {};
      user.businessProfile.businessLogo = businessLogo;
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
        avatar: user.avatar,
        businessLogo: user.businessLogo,
        setupCompleted: user.setupCompleted,
      },
    });
  } catch (error) {
    handleControllerError(error, res, 'Failed to complete setup.');
  }
};

// @desc    Complete rider setup
// @route   POST /api/setup/rider
// @access  Private
export const completeRiderSetup = async (req, res) => {
  try {
    const { profilePhoto, motorcyclePhoto, workingArea, workingHours, ratePerKm, dayRatePerKm, nightRatePerKm } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. User credentials missing.',
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can complete rider setup',
      });
    }

    // Validate that image paths are valid strings before saving
    if (profilePhoto !== undefined && profilePhoto !== null) {
      if (typeof profilePhoto !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo must be a valid string.',
        });
      }
      user.profilePhoto = profilePhoto;
      user.avatar = profilePhoto;
      user.riderProfile = user.riderProfile || {};
      user.riderProfile.profilePhoto = profilePhoto;
    }
    if (motorcyclePhoto !== undefined && motorcyclePhoto !== null && motorcyclePhoto !== '') {
      if (typeof motorcyclePhoto !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Motorcycle photo must be a valid string.',
        });
      }
      user.riderProfile = user.riderProfile || {};
      user.riderProfile.motorcycle = user.riderProfile.motorcycle || {};
      user.riderProfile.motorcycle.photo = motorcyclePhoto;
    }

    // Strict Backend Validation for Rider Setup
    if (!workingArea || !workingArea.county || !workingArea.town || !workingArea.serviceRadius) {
      return res.status(400).json({
        success: false,
        message: 'Working Area (County, Town, and Service Radius) is required.',
      });
    }

    if (!workingHours || !workingHours.start || !workingHours.end) {
      return res.status(400).json({
        success: false,
        message: 'Working Hours (Start and End times) are required.',
      });
    }

    const finalDayRate = dayRatePerKm !== undefined && dayRatePerKm !== null ? parseFloat(dayRatePerKm) : parseFloat(ratePerKm);
    const finalNightRate = nightRatePerKm !== undefined && nightRatePerKm !== null ? parseFloat(nightRatePerKm) : parseFloat(ratePerKm);

    if (isNaN(finalDayRate) || finalDayRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid Day Rate greater than 0 is required.',
      });
    }

    if (isNaN(finalNightRate) || finalNightRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid Night Rate greater than 0 is required.',
      });
    }

    // Save fields
    user.riderProfile = user.riderProfile || {};
    user.riderProfile.workingArea = workingArea;
    user.riderProfile.workingHours = workingHours;
    user.riderProfile.dayRatePerKm = finalDayRate;
    user.riderProfile.nightRatePerKm = finalNightRate;

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
    handleControllerError(error, res, 'Failed to complete setup.');
  }
};

// @desc    Mark onboarding as completed
// @route   POST /api/setup/onboarding-complete
// @access  Private
export const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. User credentials missing.',
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.onboardingCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    handleControllerError(error, res, 'Failed to complete onboarding.');
  }
};

// @desc    Get setup status
// @route   GET /api/setup/status
// @access  Private
export const getSetupStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. User credentials missing.',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

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
    handleControllerError(error, res, 'Failed to get setup status.');
  }
};
