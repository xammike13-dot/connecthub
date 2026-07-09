import express from 'express';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getBusinessProducts,
  getMyProducts,
  trackProductView,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);

// Protected routes - define BEFORE public routes with dynamic params
router.use(protect);

// Business only routes - use specific paths that don't conflict with ID patterns
router.get('/my-products', authorize('business'), getMyProducts);
router.post('/', authorize('business'), createProduct);
router.patch('/:productId/stock', authorize('business'), updateProductStock);
router.put('/:productId', authorize('business'), updateProduct);
router.delete('/:productId', authorize('business'), deleteProduct);

// Public routes with dynamic params (after protected routes)
router.get('/:productId', validateObjectId('productId'), getProduct);
router.get('/business/:businessId', validateObjectId('businessId'), getBusinessProducts);

// Track product view (authenticated only, counts only customers)
router.post('/:productId/view', protect, trackProductView);

export default router;
