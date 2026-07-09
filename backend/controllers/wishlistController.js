import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

/**
 * Get customer's wishlist
 */
export const getWishlist = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  let wishlist = await Wishlist.findOne({ customer: customerId })
    .populate({
      path: 'products.product',
      populate: {
        path: 'business',
        select: 'name email phone',
      },
    });

  if (!wishlist) {
    // Create empty wishlist if doesn't exist
    wishlist = await Wishlist.create({
      customer: customerId,
      products: [],
    });
  }

  const skip = (page - 1) * limit;
  const paginatedProducts = wishlist.products.slice(skip, skip + parseInt(limit));

  res.status(200).json({
    success: true,
    data: paginatedProducts,
    pagination: {
      total: wishlist.products.length,
      pages: Math.ceil(wishlist.products.length / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Add product to wishlist
 */
export const addToWishlist = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { productId } = req.body;

  if (!productId) {
    throw new ResponseError('Product ID is required', 400);
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  // Find or create wishlist
  let wishlist = await Wishlist.findOne({ customer: customerId });
  if (!wishlist) {
    wishlist = await Wishlist.create({
      customer: customerId,
      products: [],
    });
  }

  // Check if product already in wishlist
  const exists = wishlist.products.find(
    p => p.product.toString() === productId.toString()
  );

  if (exists) {
    throw new ResponseError('Product already in wishlist', 400);
  }

  // Add product to wishlist
  wishlist.products.push({ product: productId });
  await wishlist.save();

  // Increment product favorites count
  console.log('[WISHLIST BACKEND] Incrementing favoritesCount for product:', productId);
  await Product.findByIdAndUpdate(productId, { $inc: { favoritesCount: 1 } });
  console.log('[WISHLIST BACKEND] favoritesCount incremented for product:', productId);

  // Populate the added product
  await wishlist.populate({
    path: 'products.product',
    populate: {
      path: 'business',
      select: 'name email phone',
    },
  });

  res.status(200).json({
    success: true,
    message: 'Product added to wishlist',
    data: wishlist.products[wishlist.products.length - 1],
  });
});

/**
 * Remove product from wishlist
 */
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ customer: customerId });

  if (!wishlist) {
    throw new ResponseError('Wishlist not found', 404);
  }

  const initialLength = wishlist.products.length;
  wishlist.products = wishlist.products.filter(
    p => p.product.toString() !== productId.toString()
  );

  if (wishlist.products.length === initialLength) {
    throw new ResponseError('Product not found in wishlist', 404);
  }

  await wishlist.save();

  // Decrement product favorites count
  console.log('[WISHLIST BACKEND] Decrementing favoritesCount for product:', productId);
  await Product.findByIdAndUpdate(productId, { $inc: { favoritesCount: -1 } });
  console.log('[WISHLIST BACKEND] favoritesCount decremented for product:', productId);

  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist',
  });
});

/**
 * Check if product is in wishlist
 */
export const checkWishlistItem = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ customer: customerId });

  if (!wishlist) {
    return res.status(200).json({
      success: true,
      data: { inWishlist: false },
    });
  }

  const inWishlist = wishlist.products.some(
    p => p.product.toString() === productId.toString()
  );

  res.status(200).json({
    success: true,
    data: { inWishlist },
  });
});

/**
 * Clear entire wishlist
 */
export const clearWishlist = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  const wishlist = await Wishlist.findOne({ customer: customerId });

  if (!wishlist) {
    throw new ResponseError('Wishlist not found', 404);
  }

  wishlist.products = [];
  await wishlist.save();

  res.status(200).json({
    success: true,
    message: 'Wishlist cleared',
  });
});