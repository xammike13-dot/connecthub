import mongoose from 'mongoose';

// ===== OLAFASTA OFFICIAL CATEGORY TAXONOMY (16 categories) =====
export const OLA_BUSINESS_CATEGORIES = [
  'Olafasta Foods',
  'Olafasta Mitumba',
  'Olafasta Rentals',
  'Olafasta Tech',
  'Olafasta Chemist',
  'Olafasta Boda',
  'Olafasta Hostels',
  'Olafasta Fashion',
  'Olafasta Shoes',
  'Olafasta Materials',
  'Olafasta Home',
  'Olafasta Stores',
  'Olafasta Cakes',
  'Olafasta Wines & Spirits',
  'Olafasta Gas',
  'Olafasta Kibanda',
];

// Subcategories are free-form — businesses enter their own.
// We keep a loose reference list but do NOT enforce a strict enum,
// so existing products with older category values remain valid.
export const OLA_SUBCATEGORIES = [
  'Restaurant',
  'Wine & Spirits',
  'Gas Refill',
  'Mali Mali',
  'Households',
  'Boutique',
  'Second Hand (Mitumba)',
  'Cosmetics',
  'Electronics',
  'Repairs & Accessories',
  'Shop',
  'Chemist',
  'Everyday Services',
  'Foods',
  'Mitumba',
  'Tech',
  'Hostels',
  'Fashion',
  'Shoes',
  'Materials',
  'Home',
  'Stores',
  'Cakes',
  'Kibanda',
  'Gas',
  'Others',
];

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
    },
    category: {
      type: String,
      required: [true, 'Please provide a product category'],
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    condition: {
      type: String,
      enum: ['New', 'Second-hand', ''],
      default: '',
    },
    model: {
      type: String,
      trim: true,
      default: '',
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    images: [{
      type: String,
    }],
    coverImage: {
      type: Number,
      default: 0,
      min: 0,
    },
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
