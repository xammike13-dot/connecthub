import express from 'express';
import { getPlatformStatus, updateMaintenanceMode } from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route to inspect platform operational status
router.get('/status', getPlatformStatus);

// Protected admin route to toggle maintenance mode
router.patch('/maintenance', protect, authorize('admin'), updateMaintenanceMode);

export default router;
