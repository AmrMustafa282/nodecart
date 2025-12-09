const express = require('express');
const { logger } = require('@nodecart/shared');

const router = express.Router();

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Webhooks]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/stripe', (req, res) => {
  logger.info('Stripe webhook received', { event: req.body.type });

  // Mock webhook handling
  // In production, verify webhook signature

  res.json({ received: true });
});

/**
 * @swagger
 * /api/webhooks/paypal:
 *   post:
 *     summary: PayPal webhook endpoint
 *     tags: [Webhooks]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/paypal', (req, res) => {
  logger.info('PayPal webhook received', { event: req.body.event_type });

  // Mock webhook handling
  // In production, verify webhook signature

  res.json({ received: true });
});

module.exports = router;
