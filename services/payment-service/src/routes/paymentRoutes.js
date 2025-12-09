const express = require('express');
const { body } = require('express-validator');
const {
  authMiddleware,
  rbacMiddleware,
  validateRequest
} = require('@nodecart/shared');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments for user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/', authMiddleware, paymentController.getPayments);

/**
 * @swagger
 * /api/payments/admin/stats:
 *   get:
 *     summary: Get payment statistics (admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/admin/stats', authMiddleware, rbacMiddleware(['admin']), paymentController.getPaymentStats);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 *       404:
 *         description: Payment not found
 */
router.get('/:id', authMiddleware, paymentController.getPayment);

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Process payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *               - provider
 *               - paymentMethod
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               provider:
 *                 type: string
 *                 enum: [stripe, paypal, credit_card]
 *               paymentMethod:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Payment failed
 */
router.post(
  '/',
  authMiddleware,
  [
    body('orderId').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('provider').isIn(['stripe', 'paypal', 'credit_card']),
    body('paymentMethod').notEmpty(),
    validateRequest,
  ],
  paymentController.processPayment
);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Refund payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 */
router.post(
  '/:id/refund',
  authMiddleware,
  rbacMiddleware(['admin']),
  [
    body('amount').optional().isFloat({ min: 0 }),
    body('reason').optional().isString(),
    validateRequest,
  ],
  paymentController.refundPayment
);

module.exports = router;
