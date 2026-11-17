import Product from '../models/Product.js';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { getActiveBusinessId } from './assistantController.js';

/**
 * Create a new product
 */
export const createProduct = asyncHandler(async (req, res) => {
  const businessId = getActiveBusinessId(req.user);

  if (!businessId) {
    throw new ResponseError('Only business users or active assistants can create products', 403);
  }

  const {
    name,
    description,
    price,
    originalPrice,
    category,
    subcategory,
    condition,
    model,
    specifications,
    coverImage,
    stock,
    sku,
    brand,
    tags,
    variants,
    variations,
    addOns,
    images,
  } = req.body;

  // Validate required fields
  if (!name || !description || !price || !category) {
    throw new ResponseError('Missing required fields', 400);
  }

  const product = await Product.create({
    business: businessId,
    name,
    description,
    price,
    originalPrice,
    category,
    subcategory: subcategory || '',
    condition: condition || '',
    model: model || '',
    specifications: specifications || {},
    coverImage: coverImage || 0,
    stock,
    sku,
    brand,
    tags,
    variants,
    variations: variations || [],
    addOns: addOns || [],
    images,
  });

  // Update business profile
  await User.findByIdAndUpdate(
    businessId,
    { $inc: { 'businessProfile.totalProducts': 1 } },
    { new: true }
  );

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('product_created', product);
  }

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
 * Get related products by category, brand, and price range
 */
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 12 } = req.query;

  const product = await Product.findById(productId).select('category subcategory brand price businessCategory');

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  const skip = (page - 1) * limit;

  // Priority 1: Same category and subcategory
  let related = await Product.find({
    _id: { $ne: productId },
    isActive: true,
    category: product.category,
    subcategory: product.subcategory,
  })
    .populate('business', 'name businessProfile avatar')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  // Priority 2: Same category, different subcategory
  if (related.length < limit) {
    const existingIds = related.map(p => p._id.toString());
    existingIds.push(productId);
    const more = await Product.find({
      _id: { $nin: existingIds },
      isActive: true,
      category: product.category,
    })
      .populate('business', 'name businessProfile avatar')
      .sort('-createdAt')
      .limit(parseInt(limit) - related.length);
    related = [...related, ...more];
  }

  // Priority 3: Same businessCategory
  if (related.length < limit && product.businessCategory) {
    const existingIds = related.map(p => p._id.toString());
    existingIds.push(productId);
    const more = await Product.find({
      _id: { $nin: existingIds },
      isActive: true,
      businessCategory: product.businessCategory,
    })
      .populate('business', 'name businessProfile avatar')
      .sort('-createdAt')
      .limit(parseInt(limit) - related.length);
    related = [...related, ...more];
  }

  // Priority 4: Similar price range (+/- 50%)
  if (related.length < limit) {
    const existingIds = related.map(p => p._id.toString());
    existingIds.push(productId);
    const minPrice = product.price * 0.5;
    const maxPrice = product.price * 1.5;
    const more = await Product.find({
      _id: { $nin: existingIds },
      isActive: true,
      price: { $gte: minPrice, $lte: maxPrice },
    })
      .populate('business', 'name businessProfile avatar')
      .sort('-createdAt')
      .limit(parseInt(limit) - related.length);
    related = [...related, ...more];
  }

  res.status(200).json({
    success: true,
    data: related,
    pagination: {
      total: related.length,
      currentPage: parseInt(page),
      perPage: parseInt(limit),
    },
  });
});

/**
 * Update product
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const businessId = getActiveBusinessId(req.user);

  const product = await Product.findById(productId);

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  if (!businessId || product.business.toString() !== businessId.toString()) {
    throw new ResponseError('Not authorized to update this product', 403);
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    req.body,
    { new: true, runValidators: true }
  );

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('product_updated', updatedProduct);
  }

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
  const businessId = getActiveBusinessId(req.user);

  const product = await Product.findById(productId);

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  if (!businessId || product.business.toString() !== businessId.toString()) {
    throw new ResponseError('Not authorized to delete this product', 403);
  }

  await Product.findByIdAndDelete(productId);

  // Remove product from all customer wishlists
  await Wishlist.updateMany({}, { $pull: { products: { product: productId } } });

  // Update business profile
  await User.findByIdAndUpdate(
    businessId,
    { $inc: { 'businessProfile.totalProducts': -1 } }
  );

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('product_deleted', { productId });
  }

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
  const businessId = getActiveBusinessId(req.user);

  const product = await Product.findById(productId);

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  if (!businessId || product.business.toString() !== businessId.toString()) {
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

  // Emit real-time socket events
  const io = req.app.get('io');
  if (io) {
    io.emit('product_stock_updated', {
      productId,
      stock: updatedProduct.stock,
      isActive: updatedProduct.isActive,
      product: updatedProduct,
    });
    io.emit('product_updated', updatedProduct);
  }

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

  const product = await Product.findById(productId);
  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  // Don't count views from business owners/assistants viewing their own products
  const activeBusinessId = getActiveBusinessId(req.user);
  if (
    (userRole === 'business' || userRole === 'assistant') &&
    activeBusinessId &&
    product.business.toString() === activeBusinessId.toString()
  ) {
    return res.status(200).json({
      success: true,
      message: 'View not counted (business/assistant)',
    });
  }

  let hasViewed = false;
  let viewCount = product.views || 0;

  // Track view for authenticated customer users
  if (userRole === 'customer') {
    const user = await User.findById(userId).select('customerProfile.viewedProducts');
    const viewedProducts = user?.customerProfile?.viewedProducts || [];
    hasViewed = viewedProducts.some(id => id.toString() === productId);

    if (!hasViewed) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { 'customerProfile.viewedProducts': productId }
      });
      hasViewed = true;

      product.views = (product.views || 0) + 1;
      await product.save();
      viewCount = product.views;
    }
  } else {
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
  if (!req.user || (req.user.role !== 'business' && req.user.role !== 'assistant')) {
    throw new ResponseError('Only business users or assistants can access this endpoint', 403);
  }

  const businessId = getActiveBusinessId(req.user);
  if (!businessId) {
    throw new ResponseError('No active business association found', 403);
  }
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
