import express from 'express';
import {
  applyRole,
  reviewRole,
  approveVendor,
  getProviders,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { getProfile } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/providers/:type', getProviders);

// Protected routes (require authentication)
router.use(protect);

// Get current user profile (Must precede /:id)
router.get('/profile', getProfile);

// Partner role application (internal onboarding pipeline)
router.post('/apply-role', applyRole);

// Review role application (admin only)
router.patch('/:id/review-role', restrictTo('admin'), reviewRole);


// Get all users (admin only)
router.get('/', restrictTo('admin'), getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user (admin only, or own profile)
router.patch('/:id/approve', restrictTo('admin'), approveVendor);
router.put('/:id', updateUser);

// Delete user (admin only)
router.delete('/:id', restrictTo('admin'), deleteUser);

export default router;