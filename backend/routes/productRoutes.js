import express from 'express';
import {
  createProduct,
  getProducts,
  getProduct,
  getRelatedProducts,
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

// Specific protected routes (defined before dynamic params to avoid conflict)
router.get('/my-products', protect, authorize('business', 'assistant'), getMyProducts);
router.post('/', protect, authorize('business', 'assistant'), createProduct);
router.patch('/:productId/stock', protect, authorize('business', 'assistant'), updateProductStock);
router.put('/:productId', protect, authorize('business', 'assistant'), updateProduct);
router.delete('/:productId', protect, authorize('business', 'assistant'), deleteProduct);

// Public routes with dynamic params (accepts both MongoDB ObjectId and SEO slugs)
router.get('/:productId/related', getRelatedProducts);
router.get('/:productId', getProduct);
router.get('/business/:businessId', validateObjectId('businessId'), getBusinessProducts);

// Track product view (authenticated only, counts only customers)
router.post('/:productId/view', protect, trackProductView);

export default router;
