const { EventBus, eventTypes, logger } = require('@nodecart/shared');
const Notification = require('../models/Notification');
const EmailService = require('../services/emailService');
const { sendToUser } = require('../websocket/socket');

const eventBus = new EventBus();

/**
 * Subscribe to notification-related events
 */
const subscribeToEvents = async () => {
  try {
    await eventBus.connect();

    // Subscribe to all events that require notifications
    await eventBus.subscribe(
      'notification-service-queue',
      [
        eventTypes.USER_REGISTERED,
        eventTypes.ORDER_CREATED,
        eventTypes.PAYMENT_SUCCESS,
        eventTypes.PAYMENT_FAILED,
        eventTypes.PRODUCT_LOW_STOCK,
      ],
      async (data, event) => {
        await handleEvent(event.eventType, data);
      }
    );

    logger.info('Notification service subscribed to events');
  } catch (error) {
    logger.error('Failed to subscribe to events', { error: error.message });
  }
};

/**
 * Handle incoming events
 */
const handleEvent = async (eventType, data) => {
  try {
    logger.info('Processing event for notification', { eventType, data });

    switch (eventType) {
      case eventTypes.USER_REGISTERED:
        await handleUserRegistered(data);
        break;
      case eventTypes.ORDER_CREATED:
        await handleOrderCreated(data);
        break;
      case eventTypes.PAYMENT_SUCCESS:
        await handlePaymentSuccess(data);
        break;
      case eventTypes.PAYMENT_FAILED:
        await handlePaymentFailed(data);
        break;
      case eventTypes.PRODUCT_LOW_STOCK:
        await handleProductLowStock(data);
        break;
      default:
        logger.warn('Unhandled event type', { eventType });
    }
  } catch (error) {
    logger.error('Failed to handle event', { eventType, error: error.message });
    throw error; // Trigger retry
  }
};

/**
 * Handle user.registered event
 */
const handleUserRegistered = async (data) => {
  const { userId, email, role } = data;

  // Send welcome email
  try {
    await EmailService.sendWelcomeEmail(email, data);

    // Create notification record
    await Notification.create({
      userId,
      type: 'email',
      channel: 'user_registered',
      subject: 'Welcome to NodeCart!',
      message: 'Your account has been successfully created.',
      recipient: { email },
      status: 'sent',
      sentAt: new Date(),
    });

    logger.info('Welcome email sent', { userId, email });
  } catch (error) {
    logger.error('Failed to send welcome email', { error: error.message });
    throw error;
  }
};

/**
 * Handle order.created event
 */
const handleOrderCreated = async (data) => {
  const { orderId, userId, orderNumber, total } = data;

  // Create notification record
  const notification = await Notification.create({
    userId,
    type: 'websocket',
    channel: 'order_created',
    message: `Your order ${orderNumber} has been created successfully.`,
    data: { orderId, orderNumber, total },
    status: 'sent',
    sentAt: new Date(),
  });

  // Send via WebSocket
  sendToUser(userId, 'order_created', {
    id: notification._id,
    orderId,
    orderNumber,
    total,
    message: notification.message,
    timestamp: notification.createdAt,
  });

  logger.info('Order created notification sent', { userId, orderId });
};

/**
 * Handle payment.success event
 */
const handlePaymentSuccess = async (data) => {
  const { userId, orderId, transactionId, amount } = data;

  // Send confirmation email
  try {
    // Note: In production, fetch user email from user service
    const userEmail = data.userEmail || 'customer@example.com';

    await EmailService.sendPaymentConfirmationEmail(userEmail, {
      transactionId,
      amount,
    });

    // Create notification record
    const notification = await Notification.create({
      userId,
      type: 'email',
      channel: 'payment_success',
      subject: 'Payment Successful',
      message: `Your payment of $${amount} has been processed successfully.`,
      data: { orderId, transactionId, amount },
      recipient: { email: userEmail },
      status: 'sent',
      sentAt: new Date(),
    });

    // Send via WebSocket
    sendToUser(userId, 'payment_success', {
      id: notification._id,
      orderId,
      transactionId,
      amount,
      message: notification.message,
      timestamp: notification.createdAt,
    });

    logger.info('Payment success notification sent', { userId, transactionId });
  } catch (error) {
    logger.error('Failed to send payment success notification', { error: error.message });
    throw error;
  }
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (data) => {
  const { userId, orderId, amount, reason } = data;

  // Create notification
  const notification = await Notification.create({
    userId,
    type: 'websocket',
    channel: 'payment_failed',
    message: `Payment failed: ${reason}. Please try again.`,
    data: { orderId, amount, reason },
    status: 'sent',
    sentAt: new Date(),
  });

  // Send via WebSocket
  sendToUser(userId, 'payment_failed', {
    id: notification._id,
    orderId,
    amount,
    reason,
    message: notification.message,
    timestamp: notification.createdAt,
  });

  logger.info('Payment failed notification sent', { userId, orderId });
};

/**
 * Handle product.lowstock event
 */
const handleProductLowStock = async (data) => {
  const { productId, name, quantity, threshold } = data;

  // Send alert email to admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nodecart.com';

  try {
    await EmailService.sendLowStockAlert(adminEmail, {
      name,
      quantity,
      threshold,
    });

    // Create notification record
    await Notification.create({
      userId: 'admin',
      type: 'email',
      channel: 'product_lowstock',
      subject: `Low Stock Alert - ${name}`,
      message: `Product "${name}" is running low on stock (${quantity} remaining).`,
      data: { productId, name, quantity, threshold },
      recipient: { email: adminEmail },
      status: 'sent',
      sentAt: new Date(),
    });

    logger.info('Low stock alert sent', { productId, name, quantity });
  } catch (error) {
    logger.error('Failed to send low stock alert', { error: error.message });
    throw error;
  }
};

module.exports = { subscribeToEvents };
