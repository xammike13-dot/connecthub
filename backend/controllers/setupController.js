import User from '../models/User.js';

// @desc    Complete landlord setup
// @route   POST /api/setup/landlord
// @access  Private
export const completeLandlordSetup = async (req, res) => {
  try {
    const { profilePhoto, businessLogo } = req.body;

    const user = await User.findById(req.user.id);

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Complete business setup
// @route   POST /api/setup/business
// @access  Private
export const completeBusinessSetup = async (req, res) => {
  try {
    const { profilePhoto, businessLogo } = req.body;

    const user = await User.findById(req.user.id);

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Complete rider setup
// @route   POST /api/setup/rider
// @access  Private
export const completeRiderSetup = async (req, res) => {
  try {
    const { profilePhoto, motorcyclePhoto, workingArea, workingHours, ratePerKm } = req.body;

    const user = await User.findById(req.user.id);

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
      // workingArea should be an object with: county, town, serviceRadius
      user.riderProfile.workingArea = workingArea;
    }
    if (workingHours) {
      // workingHours should be an object with: start, end
      user.riderProfile.workingHours = workingHours;
    }
    if (ratePerKm) {
      user.riderProfile.dayRatePerKm = ratePerKm;
      user.riderProfile.nightRatePerKm = ratePerKm; // Use same rate for simplicity
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
    res.status(500).json({
      success: false,
      message: error.message,
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
