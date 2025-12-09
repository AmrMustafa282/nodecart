const Payment = require('../models/Payment');
const PaymentProcessor = require('../services/paymentProcessor');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger,
  EventBus,
  eventTypes,
} = require('@nodecart/shared');

// Initialize event bus
const eventBus = new EventBus();
eventBus.connect().catch((err) => logger.error('EventBus connection failed', { error: err.message }));

/**
 * @desc    Process payment
 * @route   POST /api/payments
 * @access  Private
 */
exports.processPayment = asyncHandler(async (req, res) => {
  const {
    orderId,
    amount,
    currency = 'USD',
    provider,
    paymentMethod,
    metadata = {},
  } = req.body;

  // Validate payment method
  PaymentProcessor.validatePaymentMethod(provider, paymentMethod);

  // Create payment record
  let payment = await Payment.create({
    orderId,
    userId: req.user.id,
    transactionId: `temp_${Date.now()}`,
    provider,
    method: paymentMethod,
    amount,
    currency,
    status: 'processing',
    metadata: {
      ...metadata,
      userEmail: req.user.email,
    },
  });

  logger.info('Payment initiated', {
    paymentId: payment._id,
    orderId,
    amount,
    provider
  });

  // Publish payment.initiated event
  try {
    await eventBus.publish(eventTypes.PAYMENT_INITIATED, {
      paymentId: payment._id.toString(),
      orderId,
      userId: req.user.id,
      amount,
      provider,
    });
  } catch (error) {
    logger.error('Failed to publish payment.initiated event', { error: error.message });
  }

  // Process payment based on provider
  try {
    let result;

    switch (provider) {
      case 'stripe':
        result = await PaymentProcessor.processStripe(amount, currency, paymentMethod, metadata);
        break;
      case 'paypal':
        result = await PaymentProcessor.processPayPal(amount, currency, metadata);
        break;
      case 'credit_card':
        result = await PaymentProcessor.processCreditCard(amount, currency, paymentMethod, metadata);
        break;
      default:
        throw new Error('Unsupported payment provider');
    }

    // Update payment record
    payment.transactionId = result.transactionId;
    payment.status = 'completed';
    payment.providerResponse = result.providerResponse;
    payment.completedAt = new Date();
    await payment.save();

    logger.info('Payment successful', {
      paymentId: payment._id,
      transactionId: result.transactionId
    });

    // Publish payment.success event
    try {
      await eventBus.publish(eventTypes.PAYMENT_SUCCESS, {
        paymentId: payment._id.toString(),
        orderId,
        userId: req.user.id,
        transactionId: result.transactionId,
        amount,
        provider,
        paidAt: payment.completedAt.toISOString(),
        items: metadata.items || [],
      });
    } catch (error) {
      logger.error('Failed to publish payment.success event', { error: error.message });
    }

    responseFormatter.success(res, {
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
    }, 'Payment processed successfully');

  } catch (error) {
    // Payment failed
    payment.status = 'failed';
    payment.failureReason = error.message;
    payment.failedAt = new Date();
    await payment.save();

    logger.error('Payment failed', {
      paymentId: payment._id,
      error: error.message
    });

    // Publish payment.failed event
    try {
      await eventBus.publish(eventTypes.PAYMENT_FAILED, {
        paymentId: payment._id.toString(),
        orderId,
        userId: req.user.id,
        amount,
        provider,
        reason: error.message,
      });
    } catch (eventError) {
      logger.error('Failed to publish payment.failed event', { error: eventError.message });
    }

    throw new AppError(`Payment failed: ${error.message}`, 400);
  }
});

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  responseFormatter.success(res, payment);
});

/**
 * @desc    Get all payments for user
 * @route   GET /api/payments
 * @access  Private
 */
exports.getPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (page - 1) * limit;

  const query = { userId: req.user.id };

  if (status) {
    query.status = status;
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(query),
  ]);

  responseFormatter.paginated(
    res,
    payments,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    },
    'Payments retrieved successfully'
  );
});

/**
 * @desc    Refund payment
 * @route   POST /api/payments/:id/refund
 * @access  Private/Admin
 */
exports.refundPayment = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.status !== 'completed') {
    throw new AppError('Only completed payments can be refunded', 400);
  }

  const refundAmount = amount || payment.amount;

  if (refundAmount > (payment.amount - payment.refundedAmount)) {
    throw new AppError('Refund amount exceeds available balance', 400);
  }

  // Process refund
  const refund = await PaymentProcessor.processRefund(
    payment.transactionId,
    refundAmount,
    reason
  );

  // Update payment record
  payment.refundedAmount += refundAmount;
  payment.refundReason = reason;
  payment.refundedAt = refund.refundedAt;

  if (payment.refundedAmount >= payment.amount) {
    payment.status = 'refunded';
  }

  await payment.save();

  logger.info('Payment refunded', {
    paymentId: payment._id,
    refundAmount
  });

  // Publish payment.refunded event
  try {
    await eventBus.publish(eventTypes.PAYMENT_REFUNDED, {
      paymentId: payment._id.toString(),
      orderId: payment.orderId,
      userId: payment.userId,
      refundAmount,
      reason,
    });
  } catch (error) {
    logger.error('Failed to publish payment.refunded event', { error: error.message });
  }

  responseFormatter.success(res, payment, 'Payment refunded successfully');
});

/**
 * @desc    Get payment statistics (admin)
 * @route   GET /api/payments/admin/stats
 * @access  Private/Admin
 */
exports.getPaymentStats = asyncHandler(async (req, res) => {
  const stats = await Payment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const providerStats = await Payment.aggregate([
    {
      $match: { status: 'completed' },
    },
    {
      $group: {
        _id: '$provider',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  responseFormatter.success(res, {
    byStatus: stats,
    byProvider: providerStats,
  });
});
