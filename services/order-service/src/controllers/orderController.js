const { Op } = require('sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const sequelize = require('../config/database');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger,
  EventBus,
  eventTypes,
  constants,
} = require('@nodecart/shared');

// Initialize event bus
const eventBus = new EventBus();
eventBus.connect().catch((err) => logger.error('EventBus connection failed', { error: err.message }));

/**
 * Generate order number
 */
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

/**
 * @desc    Get all orders for user
 * @route   GET /api/orders
 * @access  Private
 */
exports.getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (page - 1) * limit;

  const where = { userId: req.user.id };

  if (status) {
    where.status = status;
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: OrderItem,
        as: 'items',
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
  });

  responseFormatter.paginated(
    res,
    rows,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
    },
    'Orders retrieved successfully'
  );
});

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
    include: [
      {
        model: OrderItem,
        as: 'items',
      },
    ],
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  responseFormatter.success(res, order);
});

/**
 * @desc    Create order from cart
 * @route   POST /api/orders
 * @access  Private
 */
exports.createOrder = asyncHandler(async (req, res) => {
  const {
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes,
  } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({
    where: { userId: req.user.id },
  });

  if (!cart || !cart.items) {
    throw new AppError('Cart is empty', 400);
  }

  // Parse items if it's a string
  let cartItems = cart.items;
  if (typeof cartItems === 'string') {
    cartItems = JSON.parse(cartItems);
  }
  if (!Array.isArray(cartItems)) {
    cartItems = [];
  }

  if (cartItems.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Validate items and calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of cartItems) {
    // In a real scenario, fetch product details from product service
    const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      total: itemTotal,
      variant: item.variant,
    });
  }

  // Calculate totals
  const tax = subtotal * 0.1; // 10% tax
  const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
  const discount = 0;
  const total = subtotal + tax + shipping - discount;

  // Create order in transaction
  const result = await sequelize.transaction(async (t) => {
    // Create order
    const order = await Order.create(
      {
        userId: req.user.id,
        orderNumber: generateOrderNumber(),
        status: 'pending',
        subtotal,
        tax,
        shipping,
        discount,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        paymentStatus: 'pending',
        notes,
      },
      { transaction: t }
    );

    // Create order items
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      orderId: order.id,
    }));

    await OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

    // Clear cart
    await cart.update({ items: [], subtotal: 0 }, { transaction: t });

    return order;
  });

  // Fetch complete order with items
  const order = await Order.findByPk(result.id, {
    include: [
      {
        model: OrderItem,
        as: 'items',
      },
    ],
  });

  logger.info('Order created', { orderId: order.id, userId: req.user.id });

  // Publish order.created event
  try {
    await eventBus.publish(eventTypes.ORDER_CREATED, {
      orderId: order.id,
      userId: req.user.id,
      orderNumber: order.orderNumber,
      total: parseFloat(order.total),
      paymentMethod: order.paymentMethod,
      items: orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: parseFloat(item.price),
      })),
    });
  } catch (error) {
    logger.error('Failed to publish order.created event', { error: error.message });
  }

  responseFormatter.success(res, order, 'Order created successfully', 201);
});

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findOne({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if order can be cancelled
  if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled', 400);
  }

  order.status = 'cancelled';
  order.cancelReason = reason;
  order.cancelledAt = new Date();
  await order.save();

  logger.info('Order cancelled', { orderId: order.id });

  // Publish order.cancelled event
  try {
    await eventBus.publish(eventTypes.ORDER_CANCELLED, {
      orderId: order.id,
      userId: req.user.id,
      reason,
    });
  } catch (error) {
    logger.error('Failed to publish order.cancelled event', { error: error.message });
  }

  responseFormatter.success(res, order, 'Order cancelled successfully');
});

/**
 * @desc    Update order status (admin/vendor)
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;

  const order = await Order.findByPk(req.params.id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const oldStatus = order.status;
  order.status = status;

  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  if (status === 'shipped') {
    order.shippedAt = new Date();
  } else if (status === 'delivered') {
    order.deliveredAt = new Date();
  }

  await order.save();

  logger.info('Order status updated', { orderId: order.id, oldStatus, newStatus: status });

  // Publish order.updated event
  try {
    await eventBus.publish(eventTypes.ORDER_UPDATED, {
      orderId: order.id,
      userId: order.userId,
      oldStatus,
      newStatus: status,
      trackingNumber,
    });
  } catch (error) {
    logger.error('Failed to publish order.updated event', { error: error.message });
  }

  responseFormatter.success(res, order, 'Order status updated successfully');
});

/**
 * @desc    Get all orders (admin)
 * @route   GET /api/orders/admin/all
 * @access  Private/Admin
 */
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where[Op.or] = [
      { orderNumber: { [Op.like]: `%${search}%` } },
      { userId: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: OrderItem,
        as: 'items',
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
  });

  responseFormatter.paginated(
    res,
    rows,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
    },
    'Orders retrieved successfully'
  );
});
