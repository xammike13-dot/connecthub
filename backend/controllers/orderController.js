import Order from '../models/Order.js';
import Product from '../models/Product.js';

import { asyncHandler, ResponseError } from '../middleware/error.js';
import { calculateShoppingPayment } from '../utils/paymentCalculator.js';
import { releaseEscrow } from '../utils/walletService.js';
import { createOrderNotification, createNotification } from './notificationController.js';

/**
 * Create a new order
 */
export const createOrder = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  if (req.user.role !== 'customer') {
    throw new ResponseError('Only customers can create orders', 403);
  }

  const {
    items,
    deliveryFee = 0,
    discount = 0,
    business,
    orderType = 'marketplace',
    deliveryAddress,
  } = req.body;

  if (!items || items.length === 0) {
    throw new ResponseError('Order must have at least one item', 400);
  }

  // Validate items and get prices
  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new ResponseError(`Product ${item.product} not found`, 404);
    }

    if (product.stock < item.quantity) {
      throw new ResponseError(`Insufficient stock for ${product.name}`, 400);
    }

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    validatedItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price: product.price,
      variant: item.variant,
      image: product.images?.[0],
    });
  }

  // Calculate payment breakdown with platform fee
  const paymentBreakdown = calculateShoppingPayment(totalAmount, deliveryFee);

  // Final amount customer pays includes their share of platform fee
  const finalAmount = paymentBreakdown.customerPays - discount;

  // Determine the business for this order (if not supplied, infer from first product)
  let orderBusiness = business;
  if (!orderBusiness && validatedItems.length > 0) {
    const firstProduct = await Product.findById(validatedItems[0].product);
    if (firstProduct) {
      orderBusiness = firstProduct.business;
    }
  }

  const orderPayload = {
    customer: customerId,
    business: orderBusiness,
    items: validatedItems,
    totalAmount,
    deliveryFee,
    discount,
    finalAmount,
    platformFee: paymentBreakdown.platformFee,
    orderType,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'mpesa',
    deliveryAddress: {
      phone: deliveryAddress?.phone || '',
      address: deliveryAddress?.address || '',
      neighborhood: deliveryAddress?.neighborhood || '',
      landmark: deliveryAddress?.landmark || '',
    },
  };

  const order = await Order.create(orderPayload);

  // Only notify customer - business notification happens after payment confirmation
  await createOrderNotification(customerId, order, 'pending', 'customer', req);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

/**
 * Get orders for customer or business
 */
export const getOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, page = 1, limit = 10, orderType } = req.query;

  let query;

  if (req.user.role === 'customer') {
    query = { customer: userId };
    // Filter out archived orders by default
    query.hiddenByCustomer = { $ne: true };
    console.log('[CUSTOMER QUERY]', query);
  } else if (req.user.role === 'business') {
    query = { business: userId };
    console.log('[BUSINESS QUERY]', query);
  } else {
    throw new ResponseError('Not authorized to view orders', 403);
  }

  // Filter by orderType if specified (marketplace or healthcare)
  if (orderType) {
    query.orderType = orderType;
  }

  console.log('[GET ORDERS API]', {
    userId,
    userRole: req.user.role,
    initialQuery: query,
    statusFilter: status,
  });

  // DEBUG: Show all recent orders in database to verify they exist
  const allRecentOrders = await Order.find({})
    .sort('-createdAt')
    .limit(5)
    .select('customer business status paymentStatus createdAt');

  console.log('[RECENT ORDERS]', allRecentOrders.map(o => ({
    id: o._id,
    customer: o.customer,
    business: o.business,
    status: o.status,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
  })));

  if (req.user.role === 'business') {
    console.log('[BUSINESS ORDERS API][QUERY]', {
      businessId: userId,
      query,
      status: req.query.status || null,
    });
  }

  if (status) query.status = status;

  const skip = (page - 1) * limit;

  console.log('[GET ORDERS] Final query:', JSON.stringify(query, null, 2));

  const orders = await Order.find(query)
    .populate('customer', 'name email phone')
    .populate('items.product', 'name price images')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  // Debug: verify returned customer/biz order state for UI rendering
  console.log('[CUSTOMER ORDERS API]', orders.map((o) => ({
    id: o._id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    customer: o.customer?._id,
    business: o.business?._id,
  })));


  // Debug: marketplace business orders data flow
  if (req.user.role === 'business') {
    console.log('[BUSINESS ORDERS API]', {
      businessId: req.user._id,
      totalOrders: orders.length,
      orderIds: orders.map((o) => o._id),
      statuses: orders.map((o) => o.status),
      orderBusinessIds: orders.map((o) => o.business),
    });
  }

  const total = await Order.countDocuments(query);

  console.log('[GET ORDERS] Total count:', total);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    },
  });
});

/**
 * Get order by ID
 */
export const getOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId)
    .populate('customer', 'name email phone address')
    .populate('items.product')
    .populate('transaction');

  if (!order) {
    throw new ResponseError('Order not found', 404);
  }

  if (
    order.customer._id.toString() !== userId.toString() &&
    order.business?.toString?.() !== userId.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ResponseError('Not authorized to view this order', 403);
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * Business workflow (marketplace)
 * pending -> paid -> processing -> delivered -> completed (customer confirms)
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const validBusinessStatuses = ['paid', 'processing', 'delivered', 'cancelled', 'pending'];
  if (!validBusinessStatuses.includes(status)) {
    throw new ResponseError(
      'Invalid status for business. Use dedicated endpoints for accept, cancel, and mark delivered.',
      400,
    );
  }

  const order = await Order.findById(orderId).populate('customer', 'name email phone');

  if (!order) {
    throw new ResponseError('Order not found', 404);
  }

  if (order.business?.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to update this order', 403);
  }

  order.status = status;

  order.trackingHistory.push({
    status,
    timestamp: new Date(),
    note: `Order status updated to ${status} by business`,
  });

  await order.save();

  await createOrderNotification(order.customer._id, order, status, 'customer', req);

  res.status(200).json({
    success: true,
    message: `Order status updated to ${status}.`,
    data: order,
  });
});

/**
 * Customer confirms delivery (releases escrow)
 */
export const confirmDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('customer')
    .populate('business')
    .populate('transaction');

  if (!order) {
    throw new ResponseError('Order not found', 404);
  }

  if (order.customer._id.toString() !== req.user._id.toString()) {
    throw new ResponseError('Only customer can confirm delivery', 403);
  }

  if (order.status !== 'delivered') {
    throw new ResponseError('Order has not been marked delivered', 400);
  }

  console.log('[CONFIRM DELIVERY]', {
    orderId: order._id,
    previousStatus: order.status,
  });

  order.status = 'completed';
  order.completedAt = new Date();
  order.deliveryConfirmedBy = req.user._id;
  order.deliveryConfirmedAt = new Date();
  order.trackingHistory.push({
    status: 'completed',
    timestamp: new Date(),
    note: 'Customer confirmed delivery. Escrow released to business.',
  });

  await order.save();

  if (order.transaction?.status === 'paid') {
    order.transaction.status = 'completed';
    order.transaction.completedAt = new Date();
    await order.transaction.save();
  }

  const amount =
    order.transaction?.providerReceives ||
    order.finalAmount ||
    0;

  const businessId = order.business._id || order.business;
  await releaseEscrow(businessId, amount, 'marketplace_delivery_confirmed');

  try {
    await createNotification(
      order.customer._id,
      'delivery_confirmed',
      'Delivery confirmed',
      'You confirmed delivery successfully.',
      {},
      null,
      '/customer/orders',
      req
    );
  } catch (err) {
    console.error('[Customer delivery notification failed]', err);
  }

  try {
    await createNotification(
      businessId,
      'payment_received',
      'Order completed',
      'Customer confirmed delivery. Escrow funds released.',
      {},
      null,
      '/business/orders',
      req
    );
  } catch (err) {
    console.error('[Business payment notification failed]', err);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.customer._id}`).emit('order_completed', order);
    io.to(`user_${businessId}`).emit('order_completed', order);
  }

  return res.status(200).json({
    success: true,
    message: 'Delivery confirmed successfully',
    data: order,
  });
});

/**
 * Cancel order (customer only - for pending orders)
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) throw new ResponseError('Order not found', 404);

  if (order.customer.toString() !== userId.toString()) {
    throw new ResponseError('Only order customer can cancel', 403);
  }

  if (order.status !== 'pending') {
    throw new ResponseError('Can only cancel pending orders', 400);
  }

  if (order.paymentStatus === 'paid') {
    throw new ResponseError('Cannot cancel paid orders. Contact support for refund.', 400);
  }

  order.status = 'cancelled';
  await order.save();

  // Notify business about order cancellation
  const io = req.app.get('io');
  if (io && order.business) {
    io.to(`user_${order.business}`).emit('order_cancelled', {
      orderId: order._id,
      message: 'Customer cancelled the order',
      order,
    });
    try {
      await createNotification(
        order.business,
        'order_update',
        'Order Cancelled',
        `Customer cancelled order #${order._id.slice(-6).toUpperCase()}`,
        { orderId: order._id, status: 'cancelled' },
        `/business/orders/${order._id}`,
        '/business/orders',
        req
      );
    } catch (err) {
      console.error('[Business order cancellation notification failed]', err);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

/**
 * Business accepts an order
 * PUT /api/orders/:id/accept
 */
export const acceptOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { estimatedDeliveryTime } = req.body;
  const userId = req.user._id;

  if (!estimatedDeliveryTime || estimatedDeliveryTime.trim() === '') {
    throw new ResponseError('Estimated delivery time is required', 400);
  }

  const order = await Order.findById(orderId).populate('customer', 'name email phone');
  if (!order) throw new ResponseError('Order not found', 404);

  if (order.business?.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to update this order', 403);
  }

  if (order.status !== 'pending' && order.status !== 'paid') {
    throw new ResponseError('Only pending or paid orders can be accepted', 400);
  }

  order.status = 'processing';
  order.businessResponse = 'accepted';
  order.estimatedDeliveryTime = estimatedDeliveryTime;

  order.trackingHistory.push({
    status: 'processing',
    timestamp: new Date(),
    note: `Order accepted. Estimated delivery time: ${estimatedDeliveryTime}`,
  });

  await order.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io && order.customer) {
    const customerId = order.customer._id || order.customer;
    const targetRoom = `user_${customerId}`;

    io.to(targetRoom).emit('order_accepted', {
      orderId: order._id,
      message: `Your order has been accepted. Estimated delivery time: ${estimatedDeliveryTime}`,
      order,
    });
  }

  const notification = await createOrderNotification(order.customer._id || order.customer, order, 'order_accepted', 'customer', req);

  res.status(200).json({
    success: true,
    message: `Order accepted. Estimated delivery time: ${estimatedDeliveryTime}`,
    data: order,
  });
});

/**
 * Business cancels an order
 * PUT /api/orders/:id/cancel
 */
export const businessCancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { cancellationReason } = req.body;
  const userId = req.user._id;

  if (!cancellationReason || cancellationReason.trim() === '') {
    throw new ResponseError('Cancellation reason is required', 400);
  }

  const order = await Order.findById(orderId).populate('customer', 'name email phone');
  if (!order) throw new ResponseError('Order not found', 404);

  if (order.business?.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to cancel this order', 403);
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    throw new ResponseError('Cannot cancel an already completed or cancelled order', 400);
  }

  order.status = 'cancelled';
  order.businessResponse = 'cancelled';
  order.cancellationReason = cancellationReason;

  order.trackingHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: `Order cancelled by business. Reason: ${cancellationReason}`,
  });

  await order.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io && order.customer) {
    console.log('[EMITTING ORDER CANCELLED]', {
      customerId: order.customer._id,
      orderId: order._id,
      room: `user_${order.customer._id}`,
      cancellationReason
    });

    io.to(`user_${order.customer._id}`).emit('order_cancelled', {
      orderId: order._id,
      message: `Your order has been cancelled. Reason: ${cancellationReason}`,
      order,
    });

    console.log('[ORDER CANCELLED EMITTED]');
  }

  await createOrderNotification(order.customer._id, order, 'order_cancelled', 'customer', req);

  console.log('[ORDER CANCELLED BY BUSINESS]', {
    orderId: order._id,
    cancellationReason,
    customerId: order.customer._id,
  });

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

/**
 * Business marks order as delivered
 * PUT /api/orders/:id/delivered
 */
export const markOrderDelivered = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId).populate('customer', 'name email phone');
  if (!order) throw new ResponseError('Order not found', 404);

  if (order.business?.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to update this order', 403);
  }

  if (order.status !== 'processing') {
    throw new ResponseError('Only processing orders can be marked as delivered', 400);
  }

  order.status = 'delivered';
  order.deliveredAt = new Date();

  console.log('[BUSINESS DELIVERED]', {
    orderId: order._id,
    status: order.status,
  });


  order.trackingHistory.push({
    status: 'delivered',
    timestamp: new Date(),
    note: 'Order marked as delivered. Awaiting customer confirmation.',
  });

  await order.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io && order.customer) {
    console.log('[EMITTING ORDER DELIVERED]', {
      customerId: order.customer._id,
      orderId: order._id,
      room: `user_${order.customer._id}`,
      status: order.status
    });

    io.to(`user_${order.customer._id}`).emit('order_delivered', {
      orderId: order._id,
      message: 'Your order has been delivered. Please confirm receipt of goods.',
      order,
    });

    console.log('[ORDER DELIVERED EMITTED]');
  }

  await createOrderNotification(order.customer._id, order, 'order_delivered', 'customer', req);

  console.log('[MARK DELIVERED]', {
    orderId: order._id,
    newStatus: order.status,
  });

  res.status(200).json({
    success: true,
    message: 'Order marked as delivered. Customer will be notified to confirm receipt.',
    data: order,
  });
});

/**
 * Archive order (soft delete for customers)
 * PUT /api/orders/:id/archive
 */
export const archiveOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) throw new ResponseError('Order not found', 404);

  // Only customer can archive their own orders
  if (order.customer.toString() !== userId.toString()) {
    throw new ResponseError('Not authorized to archive this order', 403);
  }

  // Only allow archiving of completed or cancelled orders
  const archivableStatuses = ['completed', 'cancelled'];
  if (!archivableStatuses.includes(order.status)) {
    throw new ResponseError(
      'Can only archive completed or cancelled orders. Active orders cannot be archived.',
      400
    );
  }

  // Soft delete - mark as hidden by customer
  order.hiddenByCustomer = true;
  order.archivedByCustomer = true;
  await order.save();

  console.log('[ORDER ARCHIVED]', {
    orderId,
    status: order.status,
    archivedBy: userId,
  });

  res.status(200).json({
    success: true,
    message: 'Order archived successfully',
  });
});

/**
 * Delete order (hard delete for completed/cancelled orders only)
 * DELETE /api/orders/:id
 */
export const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  const order = await Order.findById(orderId);
  if (!order) throw new ResponseError('Order not found', 404);

  // Check authorization securely
  if (userRole === 'customer') {
    const orderCustomerId = (order.customer?._id || order.customer)?.toString();
    if (orderCustomerId !== userId.toString()) {
      throw new ResponseError('Not authorized to delete this order', 403);
    }
  } else if (userRole === 'business') {
    const orderBusinessId = (order.business?._id || order.business)?.toString();
    if (orderBusinessId !== userId.toString()) {
      throw new ResponseError('Not authorized to delete this order', 403);
    }
  } else if (userRole !== 'admin') {
    throw new ResponseError('Not authorized to delete this order', 403);
  }

  // Only allow deletion of completed or cancelled orders
  const deletableStatuses = ['completed', 'cancelled'];
  if (!deletableStatuses.includes(order.status)) {
    throw new ResponseError(
      'Can only delete completed or cancelled orders. Active orders cannot be deleted.',
      400
    );
  }

  // Hard delete - remove from database
  await Order.findByIdAndDelete(orderId);

  console.log('[ORDER DELETED]', {
    orderId,
    status: order.status,
    deletedBy: userId,
    role: userRole,
  });

  res.status(200).json({
    success: true,
    message: 'Order deleted successfully',
  });
});

