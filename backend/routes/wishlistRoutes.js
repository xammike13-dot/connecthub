import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistItem,
  clearWishlist,
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get customer's wishlist
router.get('/', getWishlist);

// Add product to wishlist
router.post('/add', addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', removeFromWishlist);

// Check if product is in wishlist
router.get('/check/:productId', checkWishlistItem);

// Clear entire wishlist
router.delete('/clear', clearWishlist);

export default router;