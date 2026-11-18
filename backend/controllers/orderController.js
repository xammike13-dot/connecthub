import Order from '../models/Order.js';
import Product from '../models/Product.js';

import { asyncHandler, ResponseError } from '../middleware/error.js';
import { calculateShoppingPayment } from '../utils/paymentCalculator.js';
import { releaseEscrow } from '../utils/walletService.js';
import { createOrderNotification, createNotification } from './notificationController.js';
import { getActiveBusinessId } from './assistantController.js';
import { getIO } from '../utils/socket.js';

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
    if (product.isActive === false) {
      throw new ResponseError(`Product "${product.name}" is currently unavailable`, 400);
    }

    const productBaseStock = (product.stock !== undefined && product.stock !== null)
      ? Number(product.stock)
      : (Number(product.stockCount) || 0);

    // Check if item has a selected variant
    let matchedVariant = null;
    if (product.variants && product.variants.length > 0) {
      if (item.variantId) {
        matchedVariant = product.variants.id?.(item.variantId) || product.variants.find(v => v._id?.toString() === item.variantId?.toString());
      }
      if (!matchedVariant && item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        matchedVariant = product.variants.find(v => {
          if (v.options && typeof v.options === 'object') {
            const opts = v.options instanceof Map ? Object.fromEntries(v.options) : v.options;
            return Object.entries(item.selectedOptions).every(([k, val]) => opts[k] === val);
          }
          if (v.name && v.value) {
            return item.selectedOptions[v.name] === v.value;
          }
          return false;
        });
      }
      if (!matchedVariant && item.variant) {
        matchedVariant = product.variants.find(v => v.name === item.variant || v.value === item.variant);
      }
    }

    // Validate variant availability
    if (matchedVariant) {
      if (matchedVariant.isActive === false || matchedVariant.isAvailable === false) {
        throw new ResponseError(`Selected variant "${matchedVariant.name || matchedVariant.value}" is currently unavailable`, 400);
      }
    }

    // Determine available stock: variant stock if specified, else base product stock
    let availableStock = productBaseStock;
    if (matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock !== null) {
      availableStock = Number(matchedVariant.stock);
    }

    if (availableStock < item.quantity) {
      throw new ResponseError(
        availableStock <= 0
          ? `"${product.name}${matchedVariant ? ` (${matchedVariant.name || matchedVariant.value})` : ''}" is out of stock`
          : `Insufficient stock for "${product.name}${matchedVariant ? ` (${matchedVariant.name || matchedVariant.value})` : ''}". Available: ${availableStock}`,
        400
      );
    }

    // Calculate base unit price: variant price (if specified) or base price + adjustment
    let itemBasePrice = product.price;
    if (matchedVariant) {
      if (matchedVariant.price !== undefined && matchedVariant.price !== null && matchedVariant.price > 0) {
        itemBasePrice = Number(matchedVariant.price);
      } else if (matchedVariant.priceAdjustment) {
        itemBasePrice = product.price + Number(matchedVariant.priceAdjustment);
      }
    }

    // Validate and calculate add-ons
    let addOnsTotal = 0;
    const verifiedAddOns = [];
    if (item.selectedAddOns && Array.isArray(item.selectedAddOns)) {
      if (product.maxAddOnsSelectable && item.selectedAddOns.length > product.maxAddOnsSelectable) {
        throw new ResponseError(`Cannot select more than ${product.maxAddOnsSelectable} add-ons for "${product.name}"`, 400);
      }
      for (const clientAddOn of item.selectedAddOns) {
        const officialAddOn = product.addOns?.find(
          (a) => a.name.toLowerCase().trim() === (clientAddOn.name || '').toLowerCase().trim()
        );
        if (officialAddOn) {
          if (officialAddOn.isActive === false || officialAddOn.isAvailable === false) {
            throw new ResponseError(`Add-on "${officialAddOn.name}" is currently unavailable`, 400);
          }
          const price = Number(officialAddOn.price) || 0;
          addOnsTotal += price;
          verifiedAddOns.push({ name: officialAddOn.name, price });
        }
      }
    }

    const itemUnitPrice = itemBasePrice + addOnsTotal;
    const itemTotal = itemUnitPrice * item.quantity;
    totalAmount += itemTotal;

    validatedItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price: itemUnitPrice,
      variant: matchedVariant ? (matchedVariant.name || matchedVariant.value || item.variant) : (item.variant || ''),
      variantId: matchedVariant?._id,
      selectedOptions: item.selectedOptions || {},
      selectedAddOns: verifiedAddOns,
      selectedVariations: item.selectedVariations || item.selectedOptions || {},
      addOnsTotal,
      image: (matchedVariant?.image) || product.images?.[0],
    });
  }

  // Calculate the customer total from product amount and delivery fee only.
  const paymentBreakdown = calculateShoppingPayment(totalAmount, deliveryFee);

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
    status: 'pending_payment',
    subtotal: totalAmount,
    vendorPayout: Math.round(totalAmount * 0.975),
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

  // Real-Time Socket.IO: Emit order:created to vendor room
  try {
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone avatar')
      .populate('items.product', 'name price images coverImage');

    const businessTargetId = order.businessId || order.business;
    const io = getIO() || req.app?.get('io');
    if (io && businessTargetId) {
      io.to('vendor_' + businessTargetId).emit('order:created', populatedOrder || order);
      console.log(`[Socket] Emitted 'order:created' to vendor_${businessTargetId} for Order #${order._id}`);
    }
  } catch (socketErr) {
    console.error('[Socket] Failed to emit order:created:', socketErr.message);
  }

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
  } else if (req.user.role === 'business' || req.user.role === 'assistant') {
    const businessId = getActiveBusinessId(req.user);
    if (!businessId) {
      throw new ResponseError('No active business association found', 403);
    }
    query = { business: businessId };
    console.log('[BUSINESS/ASSISTANT QUERY]', query);
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

  if (req.user.role === 'business' || req.user.role === 'assistant') {
    const activeBusinessId = getActiveBusinessId(req.user);
    console.log('[BUSINESS/ASSISTANT ORDERS API][QUERY]', {
      businessId: activeBusinessId,
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
  if (req.user.role === 'business' || req.user.role === 'assistant') {
    const activeBusinessId = getActiveBusinessId(req.user);
    console.log('[BUSINESS/ASSISTANT ORDERS API]', {
      businessId: activeBusinessId,
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

  const activeBusinessId = getActiveBusinessId(req.user);
  if (
    order.customer._id.toString() !== userId.toString() &&
    (!activeBusinessId || order.business?.toString() !== activeBusinessId.toString()) &&
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

  const validBusinessStatuses = ['pending_payment', 'paid', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'processing', 'completed', 'pending'];
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

  const activeBusinessId = getActiveBusinessId(req.user) || req.user._id;
  const isBusinessOwner = order.business?.toString() === activeBusinessId?.toString() ||
    order.businessId?.toString() === activeBusinessId?.toString() ||
    order.items?.some(i => i.business?.toString() === activeBusinessId?.toString()) ||
    req.user.role === 'admin';
  if (!isBusinessOwner) {
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

  // Real-Time Socket.IO: Emit order:status_updated to customer room
  try {
    const customerTargetId = order.customer?._id || order.customer;
    const io = getIO() || req.app?.get('io');
    if (io && customerTargetId) {
      io.to('user_' + customerTargetId).emit('order:status_updated', {
        orderId: order._id,
        status,
        message: `Your order is now: ${status.replace(/_/g, ' ')}`,
        updatedAt: new Date().toISOString(),
      });
      console.log(`[Socket] Emitted 'order:status_updated' to user_${customerTargetId} for Order #${order._id}`);
    }
  } catch (socketErr) {
    console.error('[Socket] Failed to emit order:status_updated:', socketErr.message);
  }

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
 * Deduct inventory for items in an order
 */
export const deductOrderInventory = async (order, io) => {
  if (!order || !order.items) return;
  for (const item of order.items) {
    if (item.product) {
      try {
        const prod = await Product.findById(item.product);
        if (prod) {
          // If variant exists, decrement variant stock
          if (item.variantId && prod.variants) {
            const variant = prod.variants.id?.(item.variantId) || prod.variants.find(v => v._id?.toString() === item.variantId?.toString());
            if (variant && variant.stock !== undefined && variant.stock !== null) {
              variant.stock = Math.max(0, variant.stock - item.quantity);
            }
          } else if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && prod.variants) {
            const variant = prod.variants.find(v => {
              if (v.options && typeof v.options === 'object') {
                const opts = v.options instanceof Map ? Object.fromEntries(v.options) : v.options;
                return Object.entries(item.selectedOptions).every(([k, val]) => opts[k] === val);
              }
              return false;
            });
            if (variant && variant.stock !== undefined && variant.stock !== null) {
              variant.stock = Math.max(0, variant.stock - item.quantity);
            }
          }

          // Decrement product overall stock
          const curStock = (prod.stock !== undefined && prod.stock !== null) ? Number(prod.stock) : (Number(prod.stockCount) || 0);
          const newStock = Math.max(0, curStock - item.quantity);
          prod.stock = newStock;
          prod.stockCount = newStock;
          await prod.save();

          if (io) {
            io.emit('product_stock_updated', {
              productId: prod._id,
              stock: newStock,
              isActive: prod.isActive,
              product: prod,
            });
          }
        }
      } catch (err) {
        console.error('Failed to deduct inventory for item:', item, err);
      }
    }
  }
};

/**
 * Restore inventory for items in an order
 */
export const restoreOrderInventory = async (order, io) => {
  if (!order || !order.items) return;
  for (const item of order.items) {
    if (item.product) {
      try {
        const prod = await Product.findById(item.product);
        if (prod) {
          // If variant exists, restore variant stock
          if (item.variantId && prod.variants) {
            const variant = prod.variants.id?.(item.variantId) || prod.variants.find(v => v._id?.toString() === item.variantId?.toString());
            if (variant && variant.stock !== undefined && variant.stock !== null) {
              variant.stock = (variant.stock || 0) + item.quantity;
            }
          } else if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && prod.variants) {
            const variant = prod.variants.find(v => {
              if (v.options && typeof v.options === 'object') {
                const opts = v.options instanceof Map ? Object.fromEntries(v.options) : v.options;
                return Object.entries(item.selectedOptions).every(([k, val]) => opts[k] === val);
              }
              return false;
            });
            if (variant && variant.stock !== undefined && variant.stock !== null) {
              variant.stock = (variant.stock || 0) + item.quantity;
            }
          }

          // Restore product overall stock
          const curStock = (prod.stock !== undefined && prod.stock !== null) ? Number(prod.stock) : (Number(prod.stockCount) || 0);
          const newStock = curStock + item.quantity;
          prod.stock = newStock;
          prod.stockCount = newStock;
          await prod.save();

          if (io) {
            io.emit('product_stock_updated', {
              productId: prod._id,
              stock: newStock,
              isActive: prod.isActive,
              product: prod,
            });
          }
        }
      } catch (err) {
        console.error('Failed to restore inventory for item:', item, err);
      }
    }
  }
};

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

  const activeBusinessId = getActiveBusinessId(req.user);
  if (!activeBusinessId || order.business?.toString() !== activeBusinessId.toString()) {
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

  const io = req.app.get('io');

  // Restore inventory on cancellation
  await restoreOrderInventory(order, io);

  // Emit socket event
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

  const activeBusinessId = getActiveBusinessId(req.user);
  if (!activeBusinessId || order.business?.toString() !== activeBusinessId.toString()) {
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

  const io = req.app.get('io');

  // Restore inventory on cancellation
  await restoreOrderInventory(order, io);

  // Emit socket event
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

  const activeBusinessId = getActiveBusinessId(req.user);
  if (!activeBusinessId || order.business?.toString() !== activeBusinessId.toString()) {
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

  const io = req.app.get('io');

  // Restore inventory on cancellation
  await restoreOrderInventory(order, io);

  // Emit socket event
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
  } else if (userRole === 'business' || userRole === 'assistant') {
    const activeBusinessId = getActiveBusinessId(req.user);
    const orderBusinessId = (order.business?._id || order.business)?.toString();
    if (!activeBusinessId || orderBusinessId !== activeBusinessId.toString()) {
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

