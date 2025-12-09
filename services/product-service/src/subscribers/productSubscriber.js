const { EventBus, eventTypes, logger } = require('@nodecart/shared');
const Product = require('../models/Product');

const eventBus = new EventBus();

/**
 * Subscribe to product-related events
 */
const subscribeToEvents = async () => {
  try {
    await eventBus.connect();

    // Subscribe to payment.success event to reduce inventory
    await eventBus.subscribe(
      'product-service-queue',
      [eventTypes.PAYMENT_SUCCESS],
      async (data) => {
        await handlePaymentSuccess(data);
      }
    );

    logger.info('Product service subscribed to events');
  } catch (error) {
    logger.error('Failed to subscribe to events', { error: error.message });
  }
};

/**
 * Handle payment.success event
 * Reduce product inventory when payment is successful
 */
const handlePaymentSuccess = async (data) => {
  try {
    const { orderId, items } = data;

    logger.info('Processing payment.success event', { orderId });

    // Update inventory for each item
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        logger.warn('Product not found', { productId: item.productId });
        continue;
      }

      const oldQuantity = product.quantity;
      product.quantity = Math.max(0, product.quantity - item.quantity);
      await product.save();

      logger.info('Product inventory reduced', {
        productId: product._id,
        oldQuantity,
        newQuantity: product.quantity,
        reducedBy: item.quantity,
      });

      // Check if product is now low stock or out of stock
      if (product.quantity === 0) {
        await eventBus.publish(eventTypes.PRODUCT_OUT_OF_STOCK, {
          productId: product._id.toString(),
          name: product.name,
        });
      } else if (product.quantity <= product.lowStockThreshold && oldQuantity > product.lowStockThreshold) {
        await eventBus.publish(eventTypes.PRODUCT_LOW_STOCK, {
          productId: product._id.toString(),
          name: product.name,
          quantity: product.quantity,
          threshold: product.lowStockThreshold,
        });
      }
    }

    logger.info('Inventory updated for order', { orderId });
  } catch (error) {
    logger.error('Failed to handle payment.success event', { error: error.message });
    throw error; // Trigger retry
  }
};

module.exports = { subscribeToEvents };
