const { EventBus, eventTypes, logger } = require('@nodecart/shared');
const Order = require('../models/Order');

const eventBus = new EventBus();

/**
 * Subscribe to order-related events
 */
const subscribeToEvents = async () => {
  try {
    await eventBus.connect();

    // Subscribe to payment events
    await eventBus.subscribe(
      'order-service-queue',
      [eventTypes.PAYMENT_SUCCESS, eventTypes.PAYMENT_FAILED],
      async (data, event) => {
        if (event.eventType === eventTypes.PAYMENT_SUCCESS) {
          await handlePaymentSuccess(data);
        } else if (event.eventType === eventTypes.PAYMENT_FAILED) {
          await handlePaymentFailed(data);
        }
      }
    );

    logger.info('Order service subscribed to events');
  } catch (error) {
    logger.error('Failed to subscribe to events', { error: error.message });
  }
};

/**
 * Handle payment.success event
 * Update order status when payment is successful
 */
const handlePaymentSuccess = async (data) => {
  try {
    const { orderId, transactionId, paidAt } = data;

    logger.info('Processing payment.success event', { orderId });

    const order = await Order.findByPk(orderId);

    if (!order) {
      logger.warn('Order not found', { orderId });
      return;
    }

    order.paymentStatus = 'completed';
    order.status = 'confirmed';
    order.paidAt = paidAt ? new Date(paidAt) : new Date();
    await order.save();

    logger.info('Order payment confirmed', { orderId, transactionId });

    // Publish order.completed event
    await eventBus.publish(eventTypes.ORDER_COMPLETED, {
      orderId: order.id,
      userId: order.userId,
      orderNumber: order.orderNumber,
      total: parseFloat(order.total),
    });
  } catch (error) {
    logger.error('Failed to handle payment.success event', { error: error.message });
    throw error; // Trigger retry
  }
};

/**
 * Handle payment.failed event
 * Update order status when payment fails
 */
const handlePaymentFailed = async (data) => {
  try {
    const { orderId, reason } = data;

    logger.info('Processing payment.failed event', { orderId });

    const order = await Order.findByPk(orderId);

    if (!order) {
      logger.warn('Order not found', { orderId });
      return;
    }

    order.paymentStatus = 'failed';
    order.notes = order.notes
      ? `${order.notes}\n\nPayment failed: ${reason}`
      : `Payment failed: ${reason}`;
    await order.save();

    logger.info('Order payment failed', { orderId, reason });
  } catch (error) {
    logger.error('Failed to handle payment.failed event', { error: error.message });
    throw error; // Trigger retry
  }
};

module.exports = { subscribeToEvents };
