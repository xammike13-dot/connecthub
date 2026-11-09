import mongoose from 'mongoose';

// ===== OLAFASTA CATEGORY TAXONOMY =====
export const OLA_CATEGORIES = {
  'Food, Drinks & Chill': ['Restaurant', 'Wine & Spirits'],
  'Hostel Setup & Utilities': ['Gas Refill', 'Mali Mali', 'Households'],
  'Fashion & Beauty': ['Boutique', 'Second Hand (Mitumba)', 'Cosmetics'],
  'Electronics & Gadgets': ['Electronics', 'Repairs & Accessories'],
  'Daily Shops & Groceries': ['Shop'],
  'Health & Pharmacy': ['Chemist'],
  'General Campus Services': ['Everyday Services'],
};

export const OLA_BUSINESS_CATEGORIES = Object.keys(OLA_CATEGORIES);

export const OLA_SUBCATEGORIES = Object.values(OLA_CATEGORIES).flat();

const productSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    businessCategory: {
      type: String,
      required: [true, 'Please select a business category'],
      trim: true,
      enum: {
        values: OLA_BUSINESS_CATEGORIES,
        message: 'Invalid Olafasta category: {VALUE}. Must be one of: ' + OLA_BUSINESS_CATEGORIES.join(', '),
      },
    },
    category: {
      type: String,
      required: [true, 'Please provide a product category'],
      trim: true,
      enum: {
        values: OLA_SUBCATEGORIES,
        message: 'Invalid subcategory: {VALUE}',
      },
    },
    subcategory: {
      type: String,
      trim: true,
      enum: {
        values: OLA_SUBCATEGORIES,
        message: 'Invalid subcategory: {VALUE}',
      },
    },
    images: [{
      type: String,
    }],
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      sparse: true,
    },
    brand: {
      type: String,
    },
    tags: [{
      type: String,
    }],
    variants: [{
      name: String,
      value: String,
      price: Number,
      stock: Number,
    }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    favoritesCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create index for text search and geospatial queries
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ location: '2dsphere' });

const Product = mongoose.model('Product', productSchema);

export default Product;