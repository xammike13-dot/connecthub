import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

import { asyncHandler, ResponseError } from '../middleware/error.js';
import { calculateShoppingPayment } from '../utils/paymentCalculator.js';
import { releaseEscrow } from '../utils/walletService.js';
import { releaseEscrowSecure, refundEscrowSecure, disputeEscrowSecure } from '../utils/escrowLedger.js';
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
 * Customer confirms delivery or collection (releases escrow)
 */
export const confirmDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('customer')
    .populate('business')
    .populate('assignedRider')
    .populate('transaction');

  if (!order) {
    throw new ResponseError('Order not found', 404);
  }

  if (order.customer._id.toString() !== req.user._id.toString()) {
    throw new ResponseError('Only customer can confirm delivery', 403);
  }

  const allowableStatuses = [
    'delivered',
    'awaiting_customer_confirmation',
    'ready_for_pickup',
    'in_transit',
    'arrived_at_destination',
    'out_for_delivery',
    'package_collected',
    'processing',
    'accepted',
  ];

  if (!allowableStatuses.includes(order.status) && order.deliveryStage !== 'delivered' && order.deliveryStage !== 'completed') {
    throw new ResponseError('Order has not reached a stage where completion can be confirmed', 400);
  }

  if (order.status === 'completed' && order.escrowStatus === 'released') {
    return res.status(200).json({
      success: true,
      message: 'Order delivery is already confirmed and escrow released',
      data: order,
    });
  }

  console.log('[CONFIRM DELIVERY]', {
    orderId: order._id,
    previousStatus: order.status,
    deliveryStage: order.deliveryStage,
    hasRider: Boolean(order.assignedRider),
  });

  order.status = 'completed';
  order.deliveryStage = 'completed';
  order.paymentStatus = 'released';
  order.fundsReleased = true;
  order.fundsReleasedAt = new Date();
  order.completedAt = new Date();
  order.deliveryConfirmedBy = req.user._id;
  order.deliveryConfirmedAt = new Date();
  order.escrowStatus = 'released';
  order.trackingHistory.push({
    status: 'completed',
    timestamp: new Date(),
    note: 'Customer confirmed delivery. Escrow funds released to entitled recipients.',
  });

  await order.save();

  const businessId = order.business._id || order.business;
  const transactionId = order.transaction?._id || order.transaction;

  let totalVendorPayout = order.subtotal || (order.finalAmount - (order.deliveryFee || 0));
  if (order.transaction?.commission?.providerReceives) {
    totalVendorPayout = order.transaction.commission.providerReceives;
    if (order.deliveryFee > 0 && order.assignedRider) {
      totalVendorPayout = Math.max(0, totalVendorPayout - order.deliveryFee);
    }
  }

  // Release escrow to business
  if (transactionId && businessId && totalVendorPayout > 0) {
    try {
      await releaseEscrowSecure({
        transactionId,
        recipientId: businessId,
        recipientRole: 'business',
        amount: totalVendorPayout,
        reason: 'marketplace_order_delivery_confirmed',
        req,
      });
    } catch (err) {
      console.error('[Escrow release to business failed]:', err.message);
    }
  }

  // Release delivery fee to rider if assigned
  const riderId = order.assignedRider?._id || order.assignedRider;
  if (transactionId && riderId && order.deliveryFee > 0) {
    try {
      await releaseEscrowSecure({
        transactionId,
        recipientId: riderId,
        recipientRole: 'rider',
        amount: order.deliveryFee,
        idempotencyKey: `release_${transactionId}_${riderId}_rider_fee`,
        reason: 'marketplace_delivery_fee_released',
        req,
      });

      // Update rider completed trip/delivery stats
      await User.findByIdAndUpdate(riderId, {
        $inc: { 'riderProfile.totalRides': 1 },
      });
    } catch (riderReleaseErr) {
      console.error('[Escrow release to rider failed]:', riderReleaseErr.message);
    }
  }

  const io = req.app.get('io') || getIO();
  if (io) {
    io.to(`user_${order.customer._id}`).emit('order_completed', order);
    io.to(`user_${businessId}`).emit('order_completed', order);
    if (riderId) {
      io.to(`user_${riderId}`).emit('order_completed', order);
    }
  }

  try {
    await createNotification(
      order.customer._id,
      'delivery_confirmed',
      'Delivery Confirmed',
      'You confirmed delivery successfully. Payment released to provider.',
      { orderId: order._id },
      '/customer/orders',
      '/customer/orders',
      req,
      'customer'
    );
  } catch (err) {
    console.error('[Customer delivery notification failed]', err);
  }

  try {
    await createNotification(
      businessId,
      'payment_received',
      'Order Delivery Confirmed',
      `Customer confirmed delivery for Order #${order._id.toString().slice(-6).toUpperCase()}. Escrow funds released to your wallet.`,
      { orderId: order._id },
      '/business/orders',
      '/business/orders',
      req,
      'business'
    );
  } catch (err) {
    console.error('[Business notification failed]', err);
  }

  if (riderId) {
    try {
      await createNotification(
        riderId,
        'payment_received',
        'Delivery Completed & Fee Released',
        `Delivery fee of KSh ${order.deliveryFee} for Order #${order._id.toString().slice(-6).toUpperCase()} released to your wallet.`,
        { orderId: order._id },
        '/rider/dashboard',
        '/rider/dashboard',
        req,
        'rider'
      );
    } catch (err) {
      console.error('[Rider notification failed]', err);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Delivery confirmed successfully and escrow funds released',
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

  if (order.status !== 'pending' && order.status !== 'paid' && order.status !== 'paid_in_escrow' && order.status !== 'pending_payment') {
    throw new ResponseError('Only pending or paid orders can be accepted', 400);
  }

  order.status = 'accepted';
  order.businessResponse = 'accepted';
  order.estimatedDeliveryTime = estimatedDeliveryTime;

  order.trackingHistory.push({
    status: 'accepted',
    timestamp: new Date(),
    note: `Order accepted by business. Estimated delivery time: ${estimatedDeliveryTime}`,
  });

  await order.save();

  const io = req.app.get('io') || getIO();

  // Emit socket event to customer
  if (io && order.customer) {
    const customerId = order.customer._id || order.customer;
    const targetRoom = `user_${customerId}`;

    io.to(targetRoom).emit('order_accepted', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      message: `Your order has been accepted. Estimated delivery time: ${estimatedDeliveryTime}`,
      order,
    });
  }

  // If order requires delivery, broadcast to available riders
  if (io && (order.deliveryFee > 0 || order.deliveryAddress?.address)) {
    io.emit('delivery_available', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      businessName: req.user.businessProfile?.businessName || req.user.name || 'Store',
      deliveryAddress: order.deliveryAddress,
      deliveryFee: order.deliveryFee,
      itemsCount: order.items?.length || 0,
      campusLandmark: order.campusLandmark || order.deliveryAddress?.neighborhood || '',
    });
  }

  await createOrderNotification(order.customer._id || order.customer, order, 'order_accepted', 'customer', req);

  res.status(200).json({
    success: true,
    message: `Order accepted. Estimated delivery time: ${estimatedDeliveryTime}`,
    data: order,
  });
});

/**
 * Business cancels/declines an order
 * PUT /api/orders/:id/cancel
 */
export const businessCancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { cancellationReason, declineReason } = req.body;
  const reason = declineReason || cancellationReason;

  if (!reason || reason.trim() === '') {
    throw new ResponseError('Cancellation/decline reason is required', 400);
  }

  const order = await Order.findById(orderId).populate('customer', 'name email phone');
  if (!order) throw new ResponseError('Order not found', 404);

  const activeBusinessId = getActiveBusinessId(req.user);
  if (!activeBusinessId || order.business?.toString() !== activeBusinessId.toString()) {
    throw new ResponseError('Not authorized to cancel this order', 403);
  }

  if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'declined') {
    throw new ResponseError('Cannot decline an already finalized order', 400);
  }

  order.status = 'declined';
  order.businessResponse = 'declined';
  order.cancellationReason = reason;
  order.declineReason = reason;
  order.escrowStatus = 'refunded';

  order.trackingHistory.push({
    status: 'declined',
    timestamp: new Date(),
    note: `Order declined by business. Reason: ${reason}`,
  });

  await order.save();

  // If paid/in escrow, refund escrow and revert pending balance
  if (order.transaction) {
    try {
      await refundEscrowSecure({
        transactionId: order.transaction,
        reason: `Order declined by business: ${reason}`,
        req,
      });
    } catch (refundErr) {
      console.error('[Refund escrow on business cancel failed]:', refundErr.message);
    }
  }

  const io = req.app.get('io') || getIO();

  // Restore inventory on cancellation
  try {
    await restoreOrderInventory(order, io);
  } catch (invErr) {
    console.error('[Failed to restore inventory on cancel]:', invErr.message);
  }

  // Emit socket event
  if (io && order.customer) {
    const customerId = order.customer._id || order.customer;
    io.to(`user_${customerId}`).emit('order_declined', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      message: `Your order was declined by the business. Reason: ${reason}. A refund has been initiated.`,
      order,
    });
    io.to(`user_${customerId}`).emit('order_cancelled', {
      orderId: order._id,
      message: `Your order was declined. Reason: ${reason}`,
      order,
    });
  }

  await createNotification(
    order.customer._id || order.customer,
    'order_declined',
    'Order Declined & Refund Initiated',
    `Your order #${order._id.toString().slice(-6).toUpperCase()} was declined by the business: "${reason}". Your escrow payment will be refunded.`,
    { orderId: order._id, reason },
    '/customer/orders',
    '/customer/orders',
    req,
    'customer'
  );

  res.status(200).json({
    success: true,
    message: 'Order declined and refund initiated',
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

  const eligibleStatuses = [
    'processing',
    'accepted',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'package_collected',
    'in_transit',
  ];

  if (!eligibleStatuses.includes(order.status)) {
    throw new ResponseError(
      `Order with status "${order.status}" cannot be marked as delivered. Order must be processed/dispatched first.`,
      400
    );
  }

  // Ensure order was actually paid
  if (order.paymentStatus !== 'paid' && order.status !== 'paid' && order.status !== 'paid_in_escrow') {
    throw new ResponseError('Cannot mark an unpaid order as delivered.', 400);
  }

  order.status = 'delivered';
  order.deliveryStage = 'delivered';
  order.deliveredAt = new Date();
  // Escrow must remain held until customer confirms
  if (order.escrowStatus === 'none') {
    order.escrowStatus = 'held';
  }
  order.fundsReleased = false;

  console.log('[BUSINESS DELIVERED]', {
    orderId: order._id,
    status: order.status,
  });

  order.trackingHistory.push({
    status: 'delivered',
    timestamp: new Date(),
    note: 'Business marked order as delivered. Awaiting customer confirmation to release escrow funds.',
  });

  await order.save();

  const io = req.app?.get('io') || getIO();

  // Emit socket events
  if (io && order.customer) {
    const customerId = order.customer._id || order.customer;
    console.log('[EMITTING ORDER DELIVERED]', {
      customerId,
      orderId: order._id,
      room: `user_${customerId}`,
      status: order.status
    });

    io.to(`user_${customerId}`).emit('order_delivered', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      message: 'Your order has been delivered. Please inspect and confirm receipt.',
      order,
    });

    io.to(`user_${customerId}`).emit('delivery_arrived', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      message: 'Your order has been marked as delivered. Please confirm receipt to complete the order.',
      order,
    });

    console.log('[ORDER DELIVERED EMITTED]');
  }

  await createOrderNotification(order.customer._id || order.customer, order, 'order_delivered', 'customer', req);

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

/**
 * Rider queries available or assigned deliveries
 * GET /api/orders/rider/deliveries
 */
export const getRiderDeliveries = asyncHandler(async (req, res) => {
  const riderId = req.user._id;
  const { type = 'available', page = 1, limit = 20 } = req.query;

  let filter = {};
  if (type === 'available') {
    filter = {
      orderType: 'marketplace',
      paymentStatus: 'paid',
      assignedRider: null,
      status: { $in: ['paid', 'paid_in_escrow', 'accepted', 'preparing', 'ready_for_pickup'] },
      $or: [
        { deliveryFee: { $gt: 0 } },
        { 'deliveryAddress.address': { $exists: true, $ne: '' } },
      ],
    };
  } else if (type === 'my_active') {
    filter = {
      assignedRider: riderId,
      status: { $nin: ['completed', 'cancelled', 'declined', 'refunded'] },
    };
  } else if (type === 'my_history') {
    filter = {
      assignedRider: riderId,
      status: 'completed',
    };
  } else {
    filter = { assignedRider: riderId };
  }

  const skip = (page - 1) * limit;
  const orders = await Order.find(filter)
    .populate('customer', 'name phone avatar')
    .populate('business', 'name phone businessProfile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Rider accepts a delivery request
 * POST /api/orders/:orderId/rider/accept
 */
export const riderAcceptDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const riderId = req.user._id;

  if (req.user.role !== 'rider') {
    throw new ResponseError('Only riders can accept deliveries', 403);
  }

  const order = await Order.findById(orderId)
    .populate('customer', 'name phone avatar')
    .populate('business', 'name phone businessProfile');

  if (!order) throw new ResponseError('Order not found', 404);

  if (order.assignedRider && order.assignedRider.toString() !== riderId.toString()) {
    throw new ResponseError('Delivery request has already been assigned to another rider', 409);
  }

  if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'declined') {
    throw new ResponseError('Order is not in an active delivery state', 400);
  }

  order.assignedRider = riderId;
  order.deliveryStage = 'assigned';
  order.status = 'rider_assigned';
  order.riderAcceptedAt = new Date();

  order.trackingHistory.push({
    status: 'rider_assigned',
    timestamp: new Date(),
    note: `Rider ${req.user.name} accepted the delivery request.`,
  });

  await order.save();

  // Load rider details for notification
  const riderUser = await User.findById(riderId);
  const riderPayload = {
    _id: riderUser._id,
    name: riderUser.name,
    phone: riderUser.phone,
    avatar: riderUser.avatar,
    profilePhoto: riderUser.avatar || riderUser.profilePhoto,
    vehicleType: riderUser.riderProfile?.vehicleType || 'Motorcycle',
    vehicleNumber: riderUser.riderProfile?.vehicleNumber || '',
    motorcycle: riderUser.riderProfile?.motorcycle || riderUser.riderProfile?.vehicleNumber || riderUser.riderProfile?.vehicleType || 'Motorcycle',
    rating: riderUser.riderProfile?.rating || 5.0,
  };

  const io = req.app.get('io') || getIO();
  if (io) {
    const customerId = order.customer._id || order.customer;
    io.to(`user_${customerId}`).emit('delivery_accepted', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      rider: riderPayload,
      order,
      message: `${riderUser.name} has accepted your delivery request.`,
    });

    if (order.business) {
      const bId = order.business._id || order.business;
      io.to(`user_${bId}`).emit('delivery_rider_assigned', {
        orderId: order._id,
        rider: riderPayload,
      });
    }
  }

  try {
    await createNotification(
      order.customer._id || order.customer,
      'delivery_accepted',
      'Rider Assigned to Your Delivery',
      `Rider ${riderUser.name} (${riderPayload.motorcycle}) has accepted your delivery. You can now track your delivery.`,
      { orderId: order._id, rider: riderPayload },
      '/customer/orders',
      '/customer/orders',
      req,
      'customer'
    );
  } catch (err) {
    console.error('[Notification on delivery accept error]:', err.message);
  }

  res.status(200).json({
    success: true,
    message: 'Delivery request accepted successfully',
    data: order,
    rider: riderPayload,
  });
});

/**
 * Rider declines a delivery request
 * POST /api/orders/:orderId/rider/decline
 */
export const riderDeclineDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const riderId = req.user._id;

  const order = await Order.findById(orderId);
  if (!order) throw new ResponseError('Order not found', 404);

  if (order.assignedRider && order.assignedRider.toString() === riderId.toString()) {
    order.assignedRider = null;
    order.deliveryStage = 'unassigned';
    order.status = 'ready_for_pickup';
    order.trackingHistory.push({
      status: 'ready_for_pickup',
      timestamp: new Date(),
      note: `Rider ${req.user.name} declined the delivery. Order re-opened for available riders.`,
    });
    await order.save();

    const io = req.app.get('io') || getIO();
    if (io) {
      io.emit('delivery_available', {
        orderId: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        deliveryAddress: order.deliveryAddress,
        deliveryFee: order.deliveryFee,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Delivery request declined',
  });
});

/**
 * Rider updates delivery stage (1 through 7)
 * PUT /api/orders/:orderId/rider/stage
 */
export const updateDeliveryStage = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { stage, note } = req.body;
  const riderId = req.user._id;

  const validStages = [
    'assigned',
    'going_to_pickup',
    'arrived_at_pickup',
    'package_collected',
    'in_transit',
    'arrived_at_destination',
    'awaiting_customer_confirmation',
    'delivered',
  ];

  if (!validStages.includes(stage)) {
    throw new ResponseError(`Invalid delivery stage. Must be one of: ${validStages.join(', ')}`, 400);
  }

  const order = await Order.findById(orderId)
    .populate('customer', 'name phone avatar')
    .populate('business', 'name phone');

  if (!order) throw new ResponseError('Order not found', 404);

  if (!order.assignedRider || order.assignedRider.toString() !== riderId.toString()) {
    throw new ResponseError('Not authorized to update delivery stages for this order', 403);
  }

  order.deliveryStage = stage === 'awaiting_customer_confirmation' ? 'delivered' : stage;
  if (stage === 'package_collected') {
    order.status = 'package_collected';
  } else if (stage === 'in_transit') {
    order.status = 'in_transit';
  } else if (stage === 'arrived_at_destination') {
    order.status = 'arrived_at_destination';
  } else if (stage === 'awaiting_customer_confirmation' || stage === 'delivered') {
    order.status = 'awaiting_customer_confirmation';
    order.deliveredAt = new Date();
  }

  const stageDescriptions = {
    assigned: 'Rider accepted delivery.',
    going_to_pickup: 'Rider is on the way to the pickup location.',
    arrived_at_pickup: 'Rider has arrived at the pickup location.',
    package_collected: 'Package has been collected from the store.',
    in_transit: 'Rider is on the way to your destination.',
    arrived_at_destination: 'Rider has arrived at your destination.',
    awaiting_customer_confirmation: 'Delivery completed by rider. Awaiting customer confirmation.',
    delivered: 'Delivery completed by rider. Awaiting customer confirmation.',
  };

  const currentNote = note || stageDescriptions[stage] || `Delivery stage updated to ${stage}`;

  order.trackingHistory.push({
    status: order.status,
    timestamp: new Date(),
    note: currentNote,
  });

  await order.save();

  const io = req.app.get('io') || getIO();
  if (io && order.customer) {
    const customerId = order.customer._id || order.customer;
    io.to(`user_${customerId}`).emit('delivery_stage_update', {
      orderId: order._id,
      stage,
      status: order.status,
      deliveryStage: order.deliveryStage,
      note: currentNote,
      order,
    });

    if (stage === 'awaiting_customer_confirmation' || stage === 'delivered') {
      io.to(`user_${customerId}`).emit('delivery_arrived', {
        orderId: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        message: 'Your order has arrived! Please inspect your package and click Confirm Delivery.',
        order,
      });
    }
  }

  try {
    const notifType = (stage === 'awaiting_customer_confirmation' || stage === 'delivered')
      ? 'delivery_completed'
      : 'order_update';

    await createNotification(
      order.customer._id || order.customer,
      notifType,
      (stage === 'awaiting_customer_confirmation' || stage === 'delivered')
        ? 'Delivery Arrived – Please Confirm'
        : 'Delivery Status Update',
      currentNote,
      { orderId: order._id, stage, status: order.status },
      '/customer/orders',
      '/customer/orders',
      req,
      'customer'
    );
  } catch (notifErr) {
    console.error('[Delivery stage notification error]:', notifErr.message);
  }

  res.status(200).json({
    success: true,
    message: `Delivery stage updated to ${stage}`,
    data: order,
  });
});

/**
 * Customer reports a dispute/problem on an order
 * POST /api/orders/:orderId/dispute
 */
export const disputeOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason, details } = req.body;
  const customerId = req.user._id;

  const order = await Order.findById(orderId)
    .populate('customer', 'name phone email')
    .populate('business', 'name phone email');

  if (!order) throw new ResponseError('Order not found', 404);

  if (order.customer._id.toString() !== customerId.toString()) {
    throw new ResponseError('Only the customer who placed this order can report a dispute', 403);
  }

  if (order.escrowStatus === 'released') {
    throw new ResponseError('Escrow funds have already been released for this completed transaction', 400);
  }

  order.status = 'disputed';
  order.escrowStatus = 'disputed';
  order.paymentStatus = 'disputed';
  order.dispute = {
    isDisputed: true,
    reason: reason || 'Service issue reported',
    details: details || '',
    status: 'open',
    reportedAt: new Date(),
    reportedBy: customerId,
  };

  order.trackingHistory.push({
    status: 'disputed',
    timestamp: new Date(),
    note: `Dispute opened by customer. Reason: ${reason}. Details: ${details || 'None'}`,
  });

  await order.save();

  if (order.transaction) {
    await disputeEscrowSecure({
      transactionId: order.transaction,
      reason,
      details,
      reportedBy: customerId,
      req,
    });
  }

  const io = req.app.get('io') || getIO();
  if (io) {
    const businessId = order.business?._id || order.business;
    if (businessId) {
      io.to(`user_${businessId}`).emit('order_disputed', {
        orderId: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        reason,
        details,
      });
    }
    if (order.assignedRider) {
      io.to(`user_${order.assignedRider}`).emit('order_disputed', {
        orderId: order._id,
        reason,
        details,
      });
    }
    io.to('admin_channel').emit('order_disputed', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      reason,
      details,
      customerId,
    });
  }

  try {
    const businessId = order.business?._id || order.business;
    if (businessId) {
      await createNotification(
        businessId,
        'order_disputed',
        'Order Disputed by Customer',
        `Customer reported a problem for Order #${order._id.toString().slice(-6).toUpperCase()}: ${reason}. Payout is held in escrow.`,
        { orderId: order._id, reason, details },
        '/business/orders',
        '/business/orders',
        req,
        'business'
      );
    }
  } catch (disputeNotifErr) {
    console.error('[Dispute notification to business error]:', disputeNotifErr.message);
  }

  try {
    await createNotification(
      customerId,
      'order_disputed',
      'Problem Reported',
      `Your report for Order #${order._id.toString().slice(-6).toUpperCase()} ("${reason}") has been received. Escrow payment is held.`,
      { orderId: order._id, reason, details },
      '/customer/orders',
      '/customer/orders',
      req,
      'customer'
    );
  } catch (custNotifErr) {
    console.error('[Dispute notification to customer error]:', custNotifErr.message);
  }

  res.status(200).json({
    success: true,
    message: 'Dispute recorded. Escrow funds are held and administrator has been notified.',
    data: order,
  });
});

