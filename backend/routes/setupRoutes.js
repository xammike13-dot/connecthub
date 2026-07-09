import express from 'express';
import {
  completeLandlordSetup,
  completeBusinessSetup,
  completeRiderSetup,
  completeOnboarding,
  getSetupStatus,
} from '../controllers/setupController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/landlord', protect, completeLandlordSetup);
router.post('/business', protect, completeBusinessSetup);
router.post('/rider', protect, completeRiderSetup);
router.post('/onboarding-complete', protect, completeOnboarding);
router.get('/status', protect, getSetupStatus);

export default router;
