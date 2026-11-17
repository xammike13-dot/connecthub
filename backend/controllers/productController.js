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
    if (categoryLower === 'healthcare' || categoryLower === 'health care') {
      query.category = /health ?care/i;
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
    query.category = { $not: /health ?care/i };
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
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
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
 * Uses a single ranked query with proper skip/limit pagination so
 * infinite scrolling never returns duplicates across pages.
 */
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 12 } = req.query;

  const product = await Product.findById(productId).select('category subcategory brand price');

  if (!product) {
    throw new ResponseError('Product not found', 404);
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  // Build a single ranked query that excludes the current product.
  // We use an aggregation with $addFields to compute a relevance score,
  // then sort by score descending and apply skip/limit.
  const matchStage = {
    _id: { $ne: product._id },
    isActive: true,
  };

  const scored = [
    // Priority 1: same category AND same subcategory (score 4)
    { category: product.category, subcategory: product.subcategory, score: 4 },
    // Priority 2: same category (score 3)
    { category: product.category, score: 3 },
    // Priority 3: similar price range +/- 50% (score 2)
    { price: { $gte: product.price * 0.5, $lte: product.price * 1.5 }, score: 2 },
  ];

  // Use aggregation with $facet to get both results and total count
  const [result] = await Product.aggregate([
    { $match: matchStage },
    // Compute relevance score from the scored conditions
    {
      $addFields: {
        relevanceScore: {
          $let: {
            vars: {
              sameCatAndSub: {
                $and: [
                  { $eq: ['$category', product.category] },
                  { $eq: ['$subcategory', product.subcategory] },
                ],
              },
              sameCat: { $eq: ['$category', product.category] },
              similarPrice: {
                $and: [
                  { $gte: ['$price', product.price * 0.5] },
                  { $lte: ['$price', product.price * 1.5] },
                ],
              },
            },
            in: {
              $switch: {
                branches: [
                  { case: '$$sameCatAndSub', then: 4 },
                  { case: '$$sameCat', then: 3 },
                  { case: '$$similarPrice', then: 2 },
                ],
                default: 1,
              },
            },
          },
        },
      },
    },
    { $sort: { relevanceScore: -1, createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limitNum }],
      },
    },
  ]);

  const relatedIds = (result?.data || []).map((p) => p._id);
  const total = result?.metadata?.[0]?.total || 0;

  // Populate business field after aggregation
  const populated = await Product.find({ _id: { $in: relatedIds } })
    .populate('business', 'name businessProfile avatar')
    .lean();

  // Re-sort populated results to match the aggregation order
  const idOrderMap = new Map(relatedIds.map((id, idx) => [id.toString(), idx]));
  populated.sort((a, b) => idOrderMap.get(a._id.toString()) - idOrderMap.get(b._id.toString()));

  res.status(200).json({
    success: true,
    data: populated,
    pagination: {
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      perPage: limitNum,
      hasMore: skip + populated.length < total,
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
