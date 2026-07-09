import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    rentals: [
      {
        rental: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Rental',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure one wishlist per customer
wishlistSchema.index({ customer: 1 }, { unique: true });

// Index for product lookups
wishlistSchema.index({ 'products.product': 1 });

// Index for rental lookups
wishlistSchema.index({ 'rentals.rental': 1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;