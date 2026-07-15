import Product from '../models/Product.js';
import User from '../models/User.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

/**
 * Create a new product
 */
export const createProduct = asyncHandler(async (req, res) => {
  const businessId = req.user._id;

  if (req.user.role !== 'business') {
    throw new ResponseError('Only business users can create products', 403);
  }

  const {
    name,
    description,
    price,
    originalPrice,
    category,
    stock,
    sku,
    brand,
    tags,
    variants,
    images,
  } = req.body;

  // Validate required fields
  if (!name || !description || !price || !category) {
    throw new ResponseError('Missing required fields', 400);
  }

  // Validate single image limit for products
  if (images && Array.isArray(images) && images.length > 1) {
    throw new ResponseError('Only one product image is allowed', 400);
  }

  const product = await Product.create({
    business: businessId,
    name,
    description,
    price,
    originalPrice,
    category,
    stock,
    sku,
    brand,
    tags,
    variants,
    images,
  });

  // Update business profile
  await User.findByIdAndUpdate(
    businessId,
    { $inc: { 'businessProfile.totalProducts': 1 } },
    { new: true }
  );

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

/**
 * Get all products with filters
 */
export const getProducts = asyncHandler(async (req, res) => {
  const { category, business, search, page = 1, limit = 20, sort = '-createdAt', excludeHealthcare = false } = req.query;

  let query = {};

  if (business) query.business = business;

  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower === 'healthcare' || categoryLower === 'health care') {
      query.category = /health ?care/i;
    } else if (categoryLower === 'food' || categoryLower === 'food-stuffs' || categoryLower === 'food stuffs') {
      query.category = { $in: ['Food', 'Food Stuffs', 'food-stuffs', 'food'] };
    } else if (categoryLower === 'household' || categoryLower === 'households' || categoryLower === 'house-shopping' || categoryLower === 'house shopping') {
      query.category = { $in: ['Household', 'Households', 'households', 'House Shopping', 'house-shopping', 'household'] };
    } else {
      query.category = new RegExp(`^${category}$`, 'i');
    }
  } else if (excludeHealthcare === 'true' || excludeHealthcare === true) {
    // Exclude healthcare products from marketplace by default (case-insensitive, with or without space)
    query.category = { $not: /health ?care/i };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .populate('business', 'name businessProfile avatar')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
    },
  });
});

/**
 * Get product by ID
 */
export const getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId)
    .populate('business', 'name email phone businessProfile avatar');

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

/**
 * Update product
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const businessId = req.user._id;

  const product = await Product.findById(productId);

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  if (product.business.toString() !== businessId.toString()) {
    throw new ResponseError('Not authorized to update this product', 403);
  }

  // Validate single image limit for products
  const { images } = req.body;
  if (images && Array.isArray(images) && images.length > 1) {
    throw new ResponseError('Only one product image is allowed', 400);
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct,
  });
});

/**
 * Delete product
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const businessId = req.user._id;

  const product = await Product.findById(productId);

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  if (product.business.toString() !== businessId.toString()) {
    throw new ResponseError('Not authorized to delete this product', 403);
  }

  await Product.findByIdAndDelete(productId);

  // Update business profile
  await User.findByIdAndUpdate(
    businessId,
    { $inc: { 'businessProfile.totalProducts': -1 } }
  );

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

/**
 * Update product stock
 */
export const updateProductStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { stock, isActive } = req.body;
  const businessId = req.user._id;

  const product = await Product.findById(productId);

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  if (product.business.toString() !== businessId.toString()) {
    throw new ResponseError('Not authorized to update this product', 403);
  }

  const updateData = {};
  if (stock !== undefined) {
    if (stock < 0) {
      throw new ResponseError('Stock cannot be negative', 400);
    }
    updateData.stock = stock;
  }
  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Product stock updated successfully',
    data: updatedProduct,
  });
});

/**
 * Get products by business
 */
export const getBusinessProducts = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const products = await Product.find({ business: businessId })
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments({ business: businessId });

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Track product view
 */
export const trackProductView = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  console.log('[VIEW BACKEND] Tracking view for product:', productId, 'User:', userId, 'Role:', userRole);

  const product = await Product.findById(productId);
  if (!product) {
    console.log('[VIEW BACKEND] Product not found:', productId);
    throw new ResponseError('Product not found', 404);
  }

  // Don't count views from business owners viewing their own products
  if (userRole === 'business' && product.business.toString() === userId.toString()) {
    console.log('[VIEW BACKEND] View not counted (business owner viewing own product):', productId);
    return res.status(200).json({
      success: true,
      message: 'View not counted (business owner)',
    });
  }

  let hasViewed = false;
  let viewCount = product.views || 0;

  // Track view for authenticated customer users
  if (userRole === 'customer') {
    // Check if already viewed
    const user = await User.findById(userId).select('customerProfile.viewedProducts');
    const viewedProducts = user?.customerProfile?.viewedProducts || [];
    hasViewed = viewedProducts.some(id => id.toString() === productId);

    if (!hasViewed) {
      // Add to viewed products
      await User.findByIdAndUpdate(userId, {
        $addToSet: { 'customerProfile.viewedProducts': productId }
      });
      hasViewed = true;

      // Increment view count
      product.views = (product.views || 0) + 1;
      await product.save();
      viewCount = product.views;
      console.log('[VIEW BACKEND] Views incremented for product:', productId, 'New count:', viewCount);
    } else {
      console.log('[VIEW BACKEND] Already viewed by customer, ignoring increment:', productId);
    }
  } else {
    // For other roles, just increment the view count (or ignore if not desired, let's increment)
    product.views = (product.views || 0) + 1;
    await product.save();
    viewCount = product.views;
  }

  res.status(200).json({
    success: true,
    message: 'View tracked',
    data: {
      hasViewed,
      views: viewCount,
    },
  });
});

/**
 * Get current business user's products
 */
export const getMyProducts = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'business') {
    throw new ResponseError('Only business users can access this endpoint', 403);
  }

  const businessId = req.user._id;
  const { page = 1, limit = 20, category, subcategory, isActive, search } = req.query;

  let query = { business: businessId };
  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});
