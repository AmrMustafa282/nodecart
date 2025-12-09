const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, validateRequest } = require('@nodecart/shared');
const cartController = require('../controllers/cartController');

const router = express.Router();

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 */
router.get('/', authMiddleware, cartController.getCart);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - productName
 *               - quantity
 *               - price
 *             properties:
 *               productId:
 *                 type: string
 *               productName:
 *                 type: string
 *               productImage:
 *                 type: string
 *               sku:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               price:
 *                 type: number
 *               variant:
 *                 type: object
 *     responses:
 *       200:
 *         description: Item added to cart
 */
router.post(
  '/items',
  authMiddleware,
  [
    body('productId').notEmpty(),
    body('productName').notEmpty(),
    body('quantity').isInt({ min: 1 }),
    body('price').isFloat({ min: 0 }),
    validateRequest,
  ],
  cartController.addToCart
);

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   put:
 *     summary: Update cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cart updated successfully
 */
router.put(
  '/items/:productId',
  authMiddleware,
  [body('quantity').isInt({ min: 0 }), validateRequest],
  cartController.updateCartItem
);

/**
 * @swagger
 * /api/cart/items/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.delete('/items/:productId', authMiddleware, cartController.removeFromCart);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete('/', authMiddleware, cartController.clearCart);

module.exports = router;
