import mongoose from 'mongoose';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import { getActiveBusinessId } from './assistantController.js';
import { OLA_BUSINESS_CATEGORIES } from '../models/Product.js';

const normalizeCategory = (category) => {
  if (!category) return category;
  const compact = category.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (compact === 'healthcare' || compact === 'health care') return 'Chemist & Wellness';
  return category;
};

const categorySlug = (category) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const validateCategory = (category) => {
  const normalized = normalizeCategory(category);
  if (!OLA_BUSINESS_CATEGORIES.includes(normalized)) {
    throw new ResponseError(`Invalid product category: ${category}`, 400);
  }
  return normalized;
};

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
    stockCount,
    sku,
    brand,
    tags,
    hasVariations,
    variants,
    variations,
    hasAddOns,
    addOns,
    maxAddOnsSelectable,
    images,
  } = req.body;

  // Validate required fields
  if (!name || !description || !price || !category) {
    throw new ResponseError('Missing required fields', 400);
  }
  const validatedCategory = validateCategory(category);

  // Normalize stock quantity
  const parsedStock = stock !== undefined && stock !== '' && stock !== null
    ? Math.max(0, parseInt(stock) || 0)
    : (stockCount !== undefined && stockCount !== '' && stockCount !== null ? Math.max(0, parseInt(stockCount) || 0) : 0);

  const product = await Product.create({
    business: businessId,
    name,
    description,
    price,
    originalPrice,
    category: validatedCategory,
    categorySlug: categorySlug(validatedCategory),
    subcategory: subcategory || '',
    condition: condition || '',
    model: model || '',
    specifications: specifications || {},
    coverImage: coverImage || 0,
    stock: parsedStock,
    stockCount: parsedStock,
    sku,
    brand,
    tags,
    hasVariations: hasVariations !== undefined ? Boolean(hasVariations) : (Array.isArray(variations) && variations.length > 0),
    variants: Array.isArray(variants) ? variants : [],
    variations: Array.isArray(variations) ? variations : [],
    hasAddOns: hasAddOns !== undefined ? Boolean(hasAddOns) : (Array.isArray(addOns) && addOns.length > 0),
    addOns: Array.isArray(addOns) ? addOns : [],
    maxAddOnsSelectable: maxAddOnsSelectable !== undefined && maxAddOnsSelectable !== '' && maxAddOnsSelectable !== null ? Number(maxAddOnsSelectable) : null,
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
  const {
    category,
    slug,
    categorySlug,
    business,
    search,
    minPrice,
    maxPrice,
    condition,
    subcategory,
    inStockOnly,
    stock,
    page = 1,
    limit = 20,
    sort = '-createdAt',
    excludeHealthcare = false,
  } = req.query;

  let query = { isActive: { $ne: false } };

  if (business) query.business = business;

  // Category or slug query
  const targetCategory = category || slug || categorySlug;
  if (targetCategory) {
    const categoryLower = targetCategory.toLowerCase().trim();
    if (categoryLower === 'healthcare' || categoryLower === 'health care' || categoryLower === 'chemist' || categoryLower === 'chemist-wellness') {
      query.$or = [
        { category: { $in: ['Chemist & Wellness', 'Healthcare', 'Health Care', 'Chemist'] } },
        { categorySlug: { $in: ['chemist-wellness', 'chemist', 'healthcare', 'health-care'] } },
      ];
    } else if (categoryLower === 'food' || categoryLower === 'food-stuffs' || categoryLower === 'food stuffs' || categoryLower === 'food-drinks') {
      query.$or = [
        { category: { $in: ['Food & Drinks', 'Food', 'Food Stuffs', 'food-stuffs', 'food'] } },
        { categorySlug: { $in: ['food-drinks', 'food'] } },
      ];
    } else if (categoryLower === 'household' || categoryLower === 'households' || categoryLower === 'house-shopping' || categoryLower === 'home-bedding') {
      query.$or = [
        { category: { $in: ['Home & Bedding', 'Household', 'Households', 'House Shopping'] } },
        { categorySlug: { $in: ['home-bedding', 'household', 'households'] } },
      ];
    } else {
      const slugPattern = categoryLower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      query.$or = [
        { category: new RegExp('^' + targetCategory + '$', 'i') },
        { categorySlug: new RegExp('^' + slugPattern + '$', 'i') },
      ];
    }
  } else if (excludeHealthcare === 'true' || excludeHealthcare === true) {
    query.category = { $nin: ['Healthcare', 'Health Care', 'Chemist', 'Chemist & Wellness'] };
  }

  // Price range filtering
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined && minPrice !== '') query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') query.price.$lte = Number(maxPrice);
  }

  // In-stock filtering
  if (inStockOnly === 'true' || inStockOnly === true || stock === 'true') {
    query.$and = (query.$and || []).concat([
      {
        $or: [
          { stock: { $gt: 0 } },
          { stockCount: { $gt: 0 } },
        ],
      },
    ]);
  }

  // Subcategory filtering
  if (subcategory && subcategory !== 'all') {
    query.subcategory = new RegExp('^' + subcategory + '$', 'i');
  }

  // Condition filtering
  if (condition && condition !== 'all') {
    query.condition = new RegExp('^' + condition + '$', 'i');
  }

  // Search
  if (search) {
    query.$and = (query.$and || []).concat([{
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ],
    }]);
  }

  // Enhanced sorting
  let sortOption = sort;
  if (sort === 'discount' || sort === '-discount' || sort === '-discountPct') {
    sortOption = { discountPct: -1, createdAt: -1 };
  } else if (sort === 'price' || sort === 'price_asc') {
    sortOption = { price: 1 };
  } else if (sort === '-price' || sort === 'price_desc') {
    sortOption = { price: -1 };
  } else if (sort === '-rating' || sort === 'rating') {
    sortOption = { rating: -1, numReviews: -1 };
  }

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .populate('business', 'name businessProfile avatar')
    .sort(sortOption)
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
 * Get product by ID or Slug (flexible lookup)
 */
export const getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const param = String(productId || '').trim();

  let product = null;

  // 1. If valid ObjectId, lookup by _id first
  if (mongoose.Types.ObjectId.isValid(param)) {
    product = await Product.findById(param)
      .populate('business', 'name email phone businessProfile avatar');
  }

  // 2. If not found or not an ObjectId, lookup by slug
  if (!product) {
    product = await Product.findOne({ slug: param.toLowerCase() })
      .populate('business', 'name email phone businessProfile avatar');
  }

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  // 3. Auto-generate and persist slug if missing on an existing record
  if (!product.slug && product.name) {
    const baseSlug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    product.slug = `${baseSlug || 'product'}-${randomSuffix}`;
    await Product.findByIdAndUpdate(product._id, { slug: product.slug });
  }

  // Ensure stock is accurately resolved for legacy or existing records
  const resolvedStock = (product.stock !== undefined && product.stock !== null)
    ? Number(product.stock)
    : (product.stockCount !== undefined && product.stockCount !== null ? Number(product.stockCount) : 0);

  if (product.stock !== resolvedStock || product.stockCount !== resolvedStock) {
    product.stock = resolvedStock;
    product.stockCount = resolvedStock;
    await Product.findByIdAndUpdate(product._id, { stock: resolvedStock, stockCount: resolvedStock });
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

/**
 * Get related products by category, brand, and price range
 * Uses indexed category query first, prioritizing same subcategory and price proximity,
 * with graceful fallback to broader active products if category has insufficient items.
 * Supports page-based pagination and structured pagination metadata for infinite scrolling.
 */
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const param = String(productId || '').trim();
  const {
    page = 1,
    limit = 12,
    category: queryCategory,
    excludeId: customExcludeId,
  } = req.query;

  let product = null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    product = await Product.findById(param).select('category categorySlug subcategory brand price specifications');
  }
  if (!product) {
    product = await Product.findOne({ slug: param.toLowerCase() }).select('category categorySlug subcategory brand price specifications');
  }

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 12);
  const skip = (pageNum - 1) * limitNum;

  const excludeId = customExcludeId || product._id;
  const targetCategory = queryCategory || product.category;
  const targetSlug = product.categorySlug || (targetCategory ? targetCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');

  // 1. Primary: Query products belonging to the same category using indexed fields
  const categoryFilter = {
    _id: { $ne: excludeId },
    isActive: { $ne: false },
    $or: [
      { category: targetCategory },
      ...(targetSlug ? [{ categorySlug: targetSlug }] : []),
    ],
  };

  const categoryTotal = await Product.countDocuments(categoryFilter);

  let populated = [];

  if (categoryTotal > 0 && skip < categoryTotal) {
    // Score within category: prioritize same subcategory and price proximity (+/- 40%)
    const branches = [];
    if (product.subcategory) {
      branches.push({
        case: { $eq: ['$subcategory', product.subcategory] },
        then: 5,
      });
    }
    if (product.price) {
      branches.push({
        case: {
          $and: [
            { $gte: ['$price', product.price * 0.6] },
            { $lte: ['$price', product.price * 1.4] },
          ],
        },
        then: 3,
      });
    }

    const pipeline = [
      { $match: categoryFilter },
    ];

    if (branches.length > 0) {
      pipeline.push({
        $addFields: {
          relevanceScore: {
            $switch: {
              branches,
              default: 1,
            },
          },
        },
      });
      pipeline.push({ $sort: { relevanceScore: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    const catResults = await Product.aggregate(pipeline);
    const catIds = catResults.map((p) => p._id);

    const populatedCat = await Product.find({ _id: { $in: catIds } })
      .populate('business', 'name email phone businessProfile avatar')
      .lean();

    const idMap = new Map(catIds.map((id, idx) => [id.toString(), idx]));
    populatedCat.sort((a, b) => idMap.get(a._id.toString()) - idMap.get(b._id.toString()));
    populated.push(...populatedCat);
  }

  // 2. Fallback: If insufficient products in the same category, supplement with additional active products
  let fallbackTotal = 0;
  if (populated.length < limitNum) {
    const needed = limitNum - populated.length;
    const existingIds = [excludeId, ...populated.map((p) => p._id)];

    const fallbackFilter = {
      _id: { $nin: existingIds },
      isActive: { $ne: false },
      ...(categoryTotal > 0 ? {
        $and: [
          { category: { $ne: targetCategory } },
          ...(targetSlug ? [{ categorySlug: { $ne: targetSlug } }] : []),
        ],
      } : {}),
    };

    fallbackTotal = await Product.countDocuments(fallbackFilter);
    const fallbackSkip = Math.max(0, skip - categoryTotal);

    if (fallbackSkip < fallbackTotal) {
      const fallbackProducts = await Product.find(fallbackFilter)
        .populate('business', 'name email phone businessProfile avatar')
        .sort({ createdAt: -1 })
        .skip(fallbackSkip)
        .limit(needed)
        .lean();

      populated.push(...fallbackProducts);
    }
  } else {
    const fallbackFilter = {
      _id: { $ne: excludeId },
      isActive: { $ne: false },
      $and: [
        { category: { $ne: targetCategory } },
        ...(targetSlug ? [{ categorySlug: { $ne: targetSlug } }] : []),
      ],
    };
    fallbackTotal = await Product.countDocuments(fallbackFilter);
  }

  const grandTotal = categoryTotal + fallbackTotal;
  const hasMore = (skip + populated.length) < grandTotal;
  const nextPage = hasMore ? pageNum + 1 : null;

  res.status(200).json({
    success: true,
    data: populated,
    pagination: {
      total: grandTotal,
      categoryTotal,
      pages: Math.ceil(grandTotal / limitNum),
      currentPage: pageNum,
      perPage: limitNum,
      hasMore,
      nextPage,
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

  if (req.body.category) {
    req.body.category = validateCategory(req.body.category);
    req.body.categorySlug = categorySlug(req.body.category);
  }

  // Update slug if product name has changed without an explicit slug supplied
  if (req.body.name && req.body.name !== product.name && !req.body.slug) {
    const baseSlug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    req.body.slug = `${baseSlug || 'product'}-${randomSuffix}`;
  }

  // Keep stock and stockCount in sync on update
  if (req.body.stock !== undefined && req.body.stock !== null && req.body.stock !== '') {
    req.body.stock = Math.max(0, parseInt(req.body.stock) || 0);
    req.body.stockCount = req.body.stock;
  } else if (req.body.stockCount !== undefined && req.body.stockCount !== null && req.body.stockCount !== '') {
    req.body.stockCount = Math.max(0, parseInt(req.body.stockCount) || 0);
    req.body.stock = req.body.stockCount;
  }

  if (req.body.hasVariations !== undefined) {
    req.body.hasVariations = Boolean(req.body.hasVariations);
  }
  if (req.body.hasAddOns !== undefined) {
    req.body.hasAddOns = Boolean(req.body.hasAddOns);
  }
  if (req.body.maxAddOnsSelectable !== undefined) {
    req.body.maxAddOnsSelectable = req.body.maxAddOnsSelectable === '' || req.body.maxAddOnsSelectable === null ? null : Number(req.body.maxAddOnsSelectable);
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
  const { stock, isActive, variantId, variantStock } = req.body;
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
    const parsedStock = Math.max(0, parseInt(stock) || 0);
    updateData.stock = parsedStock;
    updateData.stockCount = parsedStock;
  }
  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }

  // Update variant stock if variantId is provided
  if (variantId && variantStock !== undefined && product.variants) {
    const vStock = Math.max(0, parseInt(variantStock) || 0);
    const variant = product.variants.id?.(variantId) || product.variants.find(v => v._id?.toString() === variantId.toString());
    if (variant) {
      variant.stock = vStock;
      if (isActive !== undefined) {
        variant.isActive = isActive;
        variant.isAvailable = isActive;
      }
    }
    updateData.variants = product.variants;
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
  const param = String(productId || '').trim();
  const userId = req.user._id;
  const userRole = req.user.role;

  let product = null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    product = await Product.findById(param);
  }
  if (!product) {
    product = await Product.findOne({ slug: param.toLowerCase() });
  }

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
