import express from 'express';
import {
  generateInvitation,
  getInvitationDetails,
  registerCaretakerAndAccept,
  acceptInvitationExisting,
  listCaretakers,
  removeCaretaker,
  updateCaretakerStatus,
  resendInvitation,
  getCaretakerDashboardStats
} from '../controllers/caretakerController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// PUBLIC ROUTES
router.get('/invite/:token', getInvitationDetails);
router.post('/invite/:token/register', registerCaretakerAndAccept);

// AUTHENTICATED ROUTES
router.post('/invite/:token/accept', protect, acceptInvitationExisting);

// CARETAKER SPECIFIC ROUTES
router.get('/dashboard/stats', protect, authorize('caretaker'), getCaretakerDashboardStats);

// LANDLORD SPECIFIC ROUTES
router.get('/', protect, authorize('landlord'), listCaretakers);
router.post('/invite', protect, authorize('landlord'), generateInvitation);
router.delete('/:caretakerId', protect, authorize('landlord'), removeCaretaker);
router.patch('/:caretakerId/status', protect, authorize('landlord'), updateCaretakerStatus);
router.post('/:invitationId/resend', protect, authorize('landlord'), resendInvitation);

export default router;
