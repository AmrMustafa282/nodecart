const Cart = require('../models/Cart');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger
} = require('@nodecart/shared');

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({
    where: { userId: req.user.id },
  });

  if (!cart) {
    // Create empty cart
    cart = await Cart.create({
      userId: req.user.id,
      items: [],
      subtotal: 0,
    });
  }

  responseFormatter.success(res, cart);
});

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, productName, productImage, sku, quantity, price, variant } = req.body;

  let cart = await Cart.findOne({
    where: { userId: req.user.id },
  });

  if (!cart) {
    cart = await Cart.create({
      userId: req.user.id,
      items: [],
      subtotal: 0,
    });
  }

  // Parse items if it's a string
  let items = cart.items || [];
  if (typeof items === 'string') {
    items = JSON.parse(items);
  }
  if (!Array.isArray(items)) {
    items = [];
  }

  // Check if item already exists
  const existingItemIndex = items.findIndex(
    (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
  );

  if (existingItemIndex >= 0) {
    // Update quantity
    items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    items.push({
      productId,
      productName,
      productImage,
      sku,
      quantity,
      price,
      variant,
    });
  }

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cart.items = items;
  cart.subtotal = subtotal;
  await cart.save();

  logger.info('Item added to cart', { userId: req.user.id, productId });

  responseFormatter.success(res, cart, 'Item added to cart');
});

/**
 * @desc    Update cart item
 * @route   PUT /api/cart/items/:productId
 * @access  Private
 */
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  const cart = await Cart.findOne({
    where: { userId: req.user.id },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Parse items if it's a string
  let items = cart.items || [];
  if (typeof items === 'string') {
    items = JSON.parse(items);
  }
  if (!Array.isArray(items)) {
    items = [];
  }

  const itemIndex = items.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404);
  }

  if (quantity <= 0) {
    // Remove item
    items.splice(itemIndex, 1);
  } else {
    // Update quantity
    items[itemIndex].quantity = quantity;
  }

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cart.items = items;
  cart.subtotal = subtotal;
  await cart.save();

  logger.info('Cart item updated', { userId: req.user.id, productId, quantity });

  responseFormatter.success(res, cart, 'Cart updated successfully');
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 */
exports.removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({
    where: { userId: req.user.id },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Parse items if it's a string
  let items = cart.items || [];
  if (typeof items === 'string') {
    items = JSON.parse(items);
  }
  if (!Array.isArray(items)) {
    items = [];
  }

  items = items.filter((item) => item.productId !== productId);

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cart.items = items;
  cart.subtotal = subtotal;
  await cart.save();

  logger.info('Item removed from cart', { userId: req.user.id, productId });

  responseFormatter.success(res, cart, 'Item removed from cart');
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({
    where: { userId: req.user.id },
  });

  if (cart) {
    cart.items = [];
    cart.subtotal = 0;
    await cart.save();
  }

  logger.info('Cart cleared', { userId: req.user.id });

  responseFormatter.success(res, cart, 'Cart cleared successfully');
});
