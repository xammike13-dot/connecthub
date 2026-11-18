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

const variantSchema = new mongoose.Schema({
  name: { type: String, trim: true },              // e.g. "Size: 42, Color: Black" or "42"
  value: { type: String, trim: true },             // e.g. "42" or "42 / Black"
  options: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { "Size": "42", "Color": "Black" }
  price: { type: Number, min: 0 },                 // variant-specific price
  priceAdjustment: { type: Number, default: 0 },   // difference relative to base price
  stock: { type: Number, min: 0 },                 // individual stock quantity for this variant
  sku: { type: String, trim: true },
  image: { type: String, trim: true },             // variant-specific image URL
  isActive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
}, { _id: true });

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },   // e.g. "Extra Avocado"
  price: { type: Number, required: true, min: 0 },      // e.g. 30
  isActive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  isRequired: { type: Boolean, default: false },
}, { _id: true });

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
    hasVariations: {
      type: Boolean,
      default: false,
    },
    variations: [variationSchema],
    variants: [variantSchema],
    hasAddOns: {
      type: Boolean,
      default: false,
    },
    addOns: [addOnSchema],
    maxAddOnsSelectable: {
      type: Number,
      default: null,
      min: 0,
    },
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
// Auto-derive categorySlug and ensure stock & stockCount stay synchronized
productSchema.pre('save', function (next) {
  if (this.category && !this.categorySlug) {
    this.categorySlug = this.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Ensure stock and stockCount are always numbers and strictly synchronized
  if (this.stock !== undefined && this.stock !== null) {
    this.stock = Number(this.stock);
    this.stockCount = this.stock;
  } else if (this.stockCount !== undefined && this.stockCount !== null) {
    this.stockCount = Number(this.stockCount);
    this.stock = this.stockCount;
  } else {
    this.stock = 0;
    this.stockCount = 0;
  }

  // Sync hasVariations / hasAddOns flags based on presence of data
  if (Array.isArray(this.variations) && this.variations.length > 0 && this.hasVariations === undefined) {
    this.hasVariations = true;
  }
  if (Array.isArray(this.addOns) && this.addOns.length > 0 && this.hasAddOns === undefined) {
    this.hasAddOns = true;
  }

  next();
});

productSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  const update = this.getUpdate();
  if (!update) return;

  if (update.stock !== undefined && update.stock !== null) {
    update.stock = Number(update.stock);
    update.stockCount = update.stock;
  } else if (update.stockCount !== undefined && update.stockCount !== null) {
    update.stockCount = Number(update.stockCount);
    update.stock = update.stockCount;
  }

  if (update.$set) {
    if (update.$set.stock !== undefined && update.$set.stock !== null) {
      update.$set.stock = Number(update.$set.stock);
      update.$set.stockCount = update.$set.stock;
    } else if (update.$set.stockCount !== undefined && update.$set.stockCount !== null) {
      update.$set.stockCount = Number(update.$set.stockCount);
      update.$set.stock = update.$set.stockCount;
    }
  }
});

productSchema.index({ categorySlug: 1, isActive: 1, createdAt: -1 });

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ location: '2dsphere' });

const Product = mongoose.model('Product', productSchema);

export default Product;
