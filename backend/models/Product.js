import mongoose from 'mongoose';

// ===== OLAFASTA OFFICIAL CATEGORY TAXONOMY (21 categories) =====
export const OLA_BUSINESS_CATEGORIES = [
  'Bodaboda Rides',
  'Gas Refill',
  'Food & Drinks',
  'Kibanda Meals',
  'Chemist & Wellness',
  'Mini-Mart',
  'Soko (Fresh Produce)',
  'Mitumba (Thrift Clothes)',
  'Fashion & Boutiques',
  'Shoes & Kicks',
  'Tech & Gadgets',
  'Rentals & Bedsitters',
  'Hostels',
  'Home & Bedding',
  'Mali Mali (Plastics)',
  'Wines & Spirits',
  'Cakes & Pastries',
  'Grooming & Salons',
  'Print & Stationery',
  'Gaming & Subs',
  'Second-Hand Market',
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

const variationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },   // e.g. "Size", "Color"
  options: [{ type: String, trim: true }],              // e.g. ["40","41","42"]
}, { _id: false });

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },   // e.g. "Extra Avocado"
  price: { type: Number, required: true, min: 0 },      // e.g. 30
}, { _id: false });

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
    category: {
      type: String,
      required: [true, 'Please provide a category'],
    },
    categorySlug: {
      type: String,
      index: true,
      lowercase: true,
      trim: true,
    },
    subcategory: {
      type: String,
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
    stockCount: {
      type: Number,
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
    variations: [variationSchema],
    addOns: [addOnSchema],
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
// Auto-derive categorySlug and sync stockCount on save
productSchema.pre('save', function (next) {
  if (this.category && !this.categorySlug) {
    this.categorySlug = this.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (this.stockCount !== undefined && this.stock === undefined) {
    this.stock = this.stockCount;
  } else if (this.stock !== undefined && (!this.stockCount || this.stockCount === 0)) {
    this.stockCount = this.stock;
  }
  next();
});

productSchema.index({ categorySlug: 1, isActive: 1, createdAt: -1 });

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ location: '2dsphere' });

const Product = mongoose.model('Product', productSchema);

export default Product;
