import express from 'express';
import {
  generateInvitation,
  getInvitationDetails,
  registerAssistantAndAccept,
  acceptInvitationExisting,
  listAssistants,
  removeAssistant,
  updateAssistantStatus,
  resendInvitation,
  getAssistantDashboardStats,
} from '../controllers/assistantController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public invitation routes
router.get('/invite/:token', getInvitationDetails);
router.post('/invite/:token/register', registerAssistantAndAccept);

// Protected routes (require user login)
router.use(protect);

// Accept invitation (logged in user)
router.post('/invite/:token/accept', acceptInvitationExisting);

// Assistant-only routes
router.get('/dashboard/stats', authorize('assistant'), getAssistantDashboardStats);

// Business-only assistant management routes
router.use(authorize('business'));
router.post('/invite', generateInvitation);
router.get('/', listAssistants);
router.delete('/:assistantId', removeAssistant);
router.patch('/:assistantId/status', updateAssistantStatus);
router.post('/:invitationId/resend', resendInvitation);

export default router;
