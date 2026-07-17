import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'landlord', 'business', 'rider', 'caretaker'],
      default: 'customer',
    },
    avatar: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    accountActive: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    withdrawalNumber: {
      type: String,
      default: '',
    },
    // Email verification fields
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    emailVerificationAttempts: {
      type: Number,
      default: 0,
    },
    emailVerificationResendAttempts: {
      type: Number,
      default: 0,
    },
    emailVerificationLastResend: Date,

    // Phone verification fields (legacy, no longer used)
    verificationToken: String,
    phoneVerificationToken: String,
    phoneVerificationExpire: Date,
    phoneVerificationAttempts: {
      type: Number,
      default: 0,
    },
    phoneVerificationResendAttempts: {
      type: Number,
      default: 0,
    },
    phoneVerificationLastResend: Date,

    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    googleId: String,
    setupCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    profilePhoto: String,
    profilePhotoPublicId: String,
    businessLogo: String,
    businessLogoPublicId: String,
    sessions: [{
      token: String,
      device: String,
      browser: String,
      ip: String,
      loginTime: Date,
      lastActive: Date,
    }],
    // Rider specific fields
    riderProfile: {
      vehicleType: String,
      vehicleNumber: String,
      licenseNumber: String,
      nationalId: String,
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalRides: {
        type: Number,
        default: 0,
      },
      isOnline: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ['offline', 'online', 'busy', 'on_trip'],
        default: 'offline',
      },
      currentLocation: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
      },
      workingArea: {
        county: {
          type: String,
          default: '',
        },
        town: {
          type: String,
          default: '',
        },
        serviceRadius: {
          type: String,
          default: '',
        },
        selectedWorkingAreas: {
          type: [String],
          default: [],
        },
      },
      workingHours: {
        start: String,
        end: String,
      },
      dayRatePerKm: {
        type: Number,
        default: 50,
      },
      nightRatePerKm: {
        type: Number,
        default: 75,
      },
      motorcycle: {
        brand: String,
        model: String,
        plateNumber: String,
        color: String,
        year: Number,
        photo: String,
        photoPublicId: String,
      },
      lastLocationUpdate: Date,
    },
    // Business specific fields
    businessProfile: {
      businessName: String,
      businessDescription: String,
      businessAddress: String,
      businessCategory: String,
      businessLocation: String,
      businessLogo: String,
      businessContact: String,
      totalProducts: {
        type: Number,
        default: 0,
      },
      totalOrders: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
    },
    // Caretaker specific fields
    caretakerProfile: {
      landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active',
      },
      invitedAt: Date,
      addedAt: Date,
      lastActive: Date,
    },
    // Landlord specific fields
    landlordProfile: {
      propertyName: String,
      propertyDescription: String,
      propertyLocation: String,
      propertyLogo: String,
      contactDetails: String,
      totalProperties: {
        type: Number,
        default: 0,
      },
      totalBookings: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
    },
    // Customer specific fields
    customerProfile: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalRides: {
        type: Number,
        default: 0,
      },
      savedAddresses: [{
        label: String,
        address: String,
        location: {
          type: {
            type: String,
            enum: ['Point'],
          },
          coordinates: {
            type: [Number],
          },
        },
      }],
      viewedRentals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rental',
      }],
      viewedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      }],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create index for geospatial queries
userSchema.index({ 'riderProfile.currentLocation': '2dsphere' });

const User = mongoose.model('User', userSchema);

export default User;