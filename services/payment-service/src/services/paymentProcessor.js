const { v4: uuidv4 } = require('uuid');
const { logger } = require('@nodecart/shared');

/**
 * Mock payment processor simulating Stripe/PayPal
 */
class PaymentProcessor {
  /**
   * Process payment with Stripe (mock)
   */
  static async processStripe(amount, currency, paymentMethod, metadata = {}) {
    logger.info('Processing Stripe payment', { amount, currency });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success/failure based on configured rate
    const successRate = parseFloat(process.env.PAYMENT_SUCCESS_RATE || 0.9);
    const isSuccess = Math.random() < successRate;

    if (!isSuccess) {
      throw new Error('Card declined by issuer');
    }

    return {
      transactionId: `stripe_${uuidv4()}`,
      status: 'completed',
      providerResponse: {
        id: `ch_${uuidv4().replace(/-/g, '')}`,
        object: 'charge',
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        status: 'succeeded',
        paid: true,
        payment_method: paymentMethod,
      },
    };
  }

  /**
   * Process payment with PayPal (mock)
   */
  static async processPayPal(amount, currency, metadata = {}) {
    logger.info('Processing PayPal payment', { amount, currency });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Mock success/failure
    const successRate = parseFloat(process.env.PAYMENT_SUCCESS_RATE || 0.9);
    const isSuccess = Math.random() < successRate;

    if (!isSuccess) {
      throw new Error('PayPal payment declined');
    }

    return {
      transactionId: `paypal_${uuidv4()}`,
      status: 'completed',
      providerResponse: {
        id: uuidv4(),
        status: 'COMPLETED',
        amount: {
          value: amount.toFixed(2),
          currency_code: currency.toUpperCase(),
        },
        payer: {
          email_address: metadata.email || 'customer@example.com',
        },
      },
    };
  }

  /**
   * Process credit card payment (mock)
   */
  static async processCreditCard(amount, currency, cardDetails, metadata = {}) {
    logger.info('Processing credit card payment', { amount, currency });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock validation
    if (cardDetails.number === '4000000000000002') {
      throw new Error('Card declined');
    }

    // Mock success/failure
    const successRate = parseFloat(process.env.PAYMENT_SUCCESS_RATE || 0.9);
    const isSuccess = Math.random() < successRate;

    if (!isSuccess) {
      throw new Error('Insufficient funds');
    }

    return {
      transactionId: `cc_${uuidv4()}`,
      status: 'completed',
      providerResponse: {
        transactionId: uuidv4(),
        status: 'approved',
        amount,
        currency,
        cardLastFour: cardDetails.number.slice(-4),
        authCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      },
    };
  }

  /**
   * Refund payment (mock)
   */
  static async processRefund(transactionId, amount, reason) {
    logger.info('Processing refund', { transactionId, amount, reason });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock refund
    return {
      refundId: `ref_${uuidv4()}`,
      status: 'completed',
      amount,
      refundedAt: new Date(),
    };
  }

  /**
   * Validate payment method
   */
  static validatePaymentMethod(provider, paymentMethod) {
    const validProviders = ['stripe', 'paypal', 'credit_card'];

    if (!validProviders.includes(provider)) {
      throw new Error('Invalid payment provider');
    }

    // Add more validation as needed
    return true;
  }

  /**
   * Calculate fees (mock)
   */
  static calculateFees(amount, provider) {
    const feeRates = {
      stripe: 0.029, // 2.9%
      paypal: 0.031, // 3.1%
      credit_card: 0.025, // 2.5%
    };

    const rate = feeRates[provider] || 0.03;
    const fee = amount * rate + 0.30; // Base fee + percentage

    return {
      fee: parseFloat(fee.toFixed(2)),
      net: parseFloat((amount - fee).toFixed(2)),
    };
  }
}

module.exports = PaymentProcessor;
