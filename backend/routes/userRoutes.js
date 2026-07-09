import express from 'express';
import {
  getProviders,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/providers/:type', getProviders);

// Protected routes (require authentication)
router.use(protect);

// Get all users (admin only)
router.get('/', restrictTo('admin'), getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user (admin only, or own profile)
router.put('/:id', updateUser);

// Delete user (admin only)
router.delete('/:id', restrictTo('admin'), deleteUser);

export default router;