import express from 'express';
import { register, login, getProfile, updateProfile, updatePassword, logoutAllDevices, deactivateAccount, deleteAccount, debugLogin } from '../controllers/authController.js';
import { googleAuth, completeGoogleSignup } from '../controllers/googleAuthController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/google/complete', completeGoogleSignup);
router.get('/debug/test-login/:email', debugLogin);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);
router.post('/logout-all', protect, logoutAllDevices);
router.post('/deactivate', protect, deactivateAccount);
router.delete('/account', protect, deleteAccount);

export default router;