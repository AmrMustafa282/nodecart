const { EventBus, eventTypes, logger } = require('@nodecart/shared');
const Payment = require('../models/Payment');
const PaymentProcessor = require('../services/paymentProcessor');

const eventBus = new EventBus();

/**
 * Subscribe to payment-related events
 */
const subscribeToEvents = async () => {
  try {
    await eventBus.connect();

    // Subscribe to order.created event to initiate payment
    await eventBus.subscribe(
      'payment-service-queue',
      [eventTypes.ORDER_CREATED],
      async (data) => {
        await handleOrderCreated(data);
      }
    );

    logger.info('Payment service subscribed to events');
  } catch (error) {
    logger.error('Failed to subscribe to events', { error: error.message });
  }
};

/**
 * Handle order.created event
 * This is triggered when a new order is created
 * For automatic payment processing (optional)
 */
const handleOrderCreated = async (data) => {
  try {
    const { orderId, userId, total, paymentMethod, items } = data;

    logger.info('Processing order.created event', { orderId, total });

    // In this implementation, we're just logging
    // Actual payment is initiated via API call from order service or frontend

    // You could implement automatic payment processing here if needed
    // For example, for saved payment methods or recurring payments

    logger.info('Order noted for payment', { orderId, total, paymentMethod });

  } catch (error) {
    logger.error('Failed to handle order.created event', { error: error.message });
    // Don't throw - this is just a notification, not critical
  }
};

module.exports = { subscribeToEvents };
