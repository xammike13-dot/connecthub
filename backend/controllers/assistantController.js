import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AssistantInvitation from '../models/AssistantInvitation.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import { asyncHandler, ResponseError } from '../middleware/error.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Get Active Business ID for a user context
 */
export const getActiveBusinessId = (user) => {
  if (!user) return null;
  if (user.role === 'business') return user._id;
  if (user.role === 'assistant' && user.assistantProfile?.status === 'active') {
    return user.assistantProfile.business;
  }
  return null;
};

/**
 * @desc    Generate Assistant Invitation (Business only)
 * @route   POST /api/assistants/invite
 * @access  Private (Business)
 */
export const generateInvitation = asyncHandler(async (req, res) => {
  const { assistantName, assistantPhone } = req.body;
  const businessId = req.user._id;

  // Generate unique secure token
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await AssistantInvitation.create({
    business: businessId,
    token,
    assistantName: assistantName || '',
    assistantPhone: assistantPhone || '',
    status: 'pending',
    expiresAt,
  });

  // Construct sharing link
  const origin = req.headers.referer || req.headers.origin || 'https://connecthub.website';
  const parsedOrigin = new URL(origin).origin;
  const inviteLink = `${parsedOrigin}/assistant/invite/${token}`;

  res.status(201).json({
    success: true,
    message: 'Invitation link generated successfully',
    data: {
      id: invitation._id,
      token,
      assistantName: invitation.assistantName,
      assistantPhone: invitation.assistantPhone,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviteLink,
    },
  });
});

/**
 * @desc    Get Invitation Details (Public)
 * @route   GET /api/assistants/invite/:token
 * @access  Public
 */
export const getInvitationDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invitation = await AssistantInvitation.findOne({ token })
    .populate('business', 'name email phone businessProfile');

  if (!invitation) {
    throw new ResponseError('Invitation not found', 404);
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new ResponseError('This invitation link has expired', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ResponseError(`This invitation has already been ${invitation.status}`, 400);
  }

  res.status(200).json({
    success: true,
    data: {
      token: invitation.token,
      assistantName: invitation.assistantName,
      assistantPhone: invitation.assistantPhone,
      expiresAt: invitation.expiresAt,
      business: {
        id: invitation.business._id,
        name: invitation.business.name,
        email: invitation.business.email,
        phone: invitation.business.phone,
        businessName: invitation.business.businessProfile?.businessName || 'Their Business',
      },
    },
  });
});

/**
 * @desc    Register new user as assistant and accept invitation
 * @route   POST /api/assistants/invite/:token/register
 * @access  Public
 */
export const registerAssistantAndAccept = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    throw new ResponseError('Please provide all required fields', 400);
  }

  const invitation = await AssistantInvitation.findOne({ token });

  if (!invitation) {
    throw new ResponseError('Invitation not found', 404);
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new ResponseError('This invitation has expired', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ResponseError(`This invitation has already been ${invitation.status}`, 400);
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ResponseError('A user already exists with this email. Please log in to accept the invitation instead.', 400);
  }

  // Create new user as assistant
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'assistant',
    emailVerified: true, // Auto-verify email for assistant invitation registrations
    isActive: true,
    setupCompleted: true,
    onboardingCompleted: true,
    assistantProfile: {
      business: invitation.business,
      status: 'active',
      invitedAt: invitation.createdAt,
      addedAt: new Date(),
    },
  });

  // Update invitation
  invitation.status = 'accepted';
  invitation.assistant = user._id;
  await invitation.save();

  // Create notifications
  await Notification.create({
    user: invitation.business,
    type: 'system',
    notificationType: 'system',
    title: 'Assistant Added',
    message: `${user.name} has accepted your invitation and is now an assistant for your business.`,
    status: 'unread',
  });

  // Generate JWT Token
  const jwtToken = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Assistant registered and associated successfully',
    token: jwtToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
});

/**
 * @desc    Accept invitation for existing/logged-in user
 * @route   POST /api/assistants/invite/:token/accept
 * @access  Private (Authenticated)
 */
export const acceptInvitationExisting = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const userId = req.user._id;

  const invitation = await AssistantInvitation.findOne({ token });

  if (!invitation) {
    throw new ResponseError('Invitation not found', 404);
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new ResponseError('This invitation has expired', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ResponseError(`This invitation has already been ${invitation.status}`, 400);
  }

  // Update user role and assistant profile
  const user = await User.findById(req.user._id);
  user.role = 'assistant';
  user.onboardingCompleted = true;
  user.setupCompleted = true;
  user.assistantProfile = {
    business: invitation.business,
    status: 'active',
    invitedAt: invitation.createdAt,
    addedAt: new Date(),
  };
  await user.save();

  // Update invitation
  invitation.status = 'accepted';
  invitation.assistant = userId;
  await invitation.save();

  // Notify business
  await Notification.create({
    user: invitation.business,
    type: 'system',
    notificationType: 'system',
    title: 'Assistant Added',
    message: `${user.name} has accepted your invitation and is now an assistant for your business.`,
    status: 'unread',
  });

  res.status(200).json({
    success: true,
    message: 'Invitation accepted successfully. You are now an Assistant.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      setupCompleted: user.setupCompleted,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
});

/**
 * @desc    List Assistants and Invitations (Business only)
 * @route   GET /api/assistants
 * @access  Private (Business)
 */
export const listAssistants = asyncHandler(async (req, res) => {
  const businessId = req.user._id;

  // 1. Fetch Assistant users
  const assistants = await User.find({
    role: 'assistant',
    'assistantProfile.business': businessId,
  }).select('name email phone assistantProfile lastLogin createdAt');

  // 2. Fetch pending/expired/disabled invitations
  const invitations = await AssistantInvitation.find({
    business: businessId,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      assistants: assistants.map(a => ({
        id: a._id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        status: a.assistantProfile?.status || 'active',
        addedAt: a.assistantProfile?.addedAt || a.createdAt,
        lastActive: a.assistantProfile?.lastActive || a.lastLogin || null,
      })),
      invitations: invitations.map(i => {
        const origin = req.headers.referer || req.headers.origin || 'https://connecthub.website';
        const parsedOrigin = new URL(origin).origin;
        return {
          id: i._id,
          token: i.token,
          assistantName: i.assistantName,
          assistantPhone: i.assistantPhone,
          status: i.expiresAt < new Date() && i.status === 'pending' ? 'expired' : i.status,
          expiresAt: i.expiresAt,
          inviteLink: `${parsedOrigin}/assistant/invite/${i.token}`,
          createdAt: i.createdAt,
        };
      }),
    },
  });
});

/**
 * @desc    Remove Assistant (Business only)
 * @route   DELETE /api/assistants/:assistantId
 * @access  Private (Business)
 */
export const removeAssistant = asyncHandler(async (req, res) => {
  const { assistantId } = req.params;
  const businessId = req.user._id;

  const assistant = await User.findOne({
    _id: assistantId,
    role: 'assistant',
    'assistantProfile.business': businessId,
  });

  if (!assistant) {
    throw new ResponseError('Assistant not found or does not belong to you', 404);
  }

  // Set assistant role back to customer and remove profile
  assistant.role = 'customer';
  assistant.assistantProfile = undefined;
  await assistant.save();

  // Also update any invitations that were accepted by this assistant
  await AssistantInvitation.updateMany(
    { assistant: assistantId, business: businessId },
    { status: 'disabled' }
  );

  res.status(200).json({
    success: true,
    message: 'Assistant successfully removed and reset to standard customer role.',
  });
});

/**
 * @desc    Disable/Reactivate Assistant (Business only)
 * @route   PATCH /api/assistants/:assistantId/status
 * @access  Private (Business)
 */
export const updateAssistantStatus = asyncHandler(async (req, res) => {
  const { assistantId } = req.params;
  const { status } = req.body;
  const businessId = req.user._id;

  if (!['active', 'disabled'].includes(status)) {
    throw new ResponseError('Invalid status. Must be active or disabled.', 400);
  }

  const assistant = await User.findOne({
    _id: assistantId,
    role: 'assistant',
    'assistantProfile.business': businessId,
  });

  if (!assistant) {
    throw new ResponseError('Assistant not found or does not belong to you', 404);
  }

  assistant.assistantProfile.status = status;
  await assistant.save();

  res.status(200).json({
    success: true,
    message: `Assistant status updated to ${status} successfully.`,
    data: {
      id: assistant._id,
      name: assistant.name,
      status: assistant.assistantProfile.status,
    },
  });
});

/**
 * @desc    Resend / Regenerate Invitation (Business only)
 * @route   POST /api/assistants/:invitationId/resend
 * @access  Private (Business)
 */
export const resendInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const businessId = req.user._id;

  const invite = await AssistantInvitation.findOne({
    _id: invitationId,
    business: businessId,
  });

  if (!invite) {
    throw new ResponseError('Invitation not found', 404);
  }

  // Extend expiration to 7 days from now and generate a fresh token
  const token = crypto.randomBytes(24).toString('hex');
  invite.token = token;
  invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  invite.status = 'pending';
  await invite.save();

  const origin = req.headers.referer || req.headers.origin || 'https://connecthub.website';
  const parsedOrigin = new URL(origin).origin;
  const inviteLink = `${parsedOrigin}/assistant/invite/${token}`;

  res.status(200).json({
    success: true,
    message: 'Invitation regenerated successfully.',
    data: {
      id: invite._id,
      token,
      assistantName: invite.assistantName,
      assistantPhone: invite.assistantPhone,
      status: invite.status,
      expiresAt: invite.expiresAt,
      inviteLink,
    },
  });
});

/**
 * @desc    Get Assistant Dashboard Stats (Assistant only, completely omitting financial/wallet details)
 * @route   GET /api/assistants/dashboard/stats
 * @access  Private (Assistant)
 */
export const getAssistantDashboardStats = asyncHandler(async (req, res) => {
  const businessId = getActiveBusinessId(req.user);

  if (!businessId) {
    throw new ResponseError('No active business association found for this assistant.', 403);
  }

  // Get all products for this business
  const products = await Product.find({ business: businessId });
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.isActive && p.stock > 0).length;
  const outOfStockProducts = products.filter(p => p.stock <= 0).length;

  // Get orders for this business
  const orders = await Order.find({ business: businessId });
  const totalOrders = orders.length;

  // Order status counts
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  // Get rating from business profile
  const user = await User.findById(businessId);
  const rating = user?.businessProfile?.rating || 0;

  // Get recent orders (last 5)
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(order => ({
      _id: order._id,
      customer: order.customer,
      items: order.items.length,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      status: order.status,
      orderType: order.orderType,
      createdAt: order.createdAt,
    }));

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      rating,
      recentOrders,
    },
  });
});
