/**
 * Application-wide constants
 */
module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    VENDOR: 'vendor',
  },

  // Order status
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  },

  // Payment status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },

  // Payment methods
  PAYMENT_METHODS: {
    CREDIT_CARD: 'credit_card',
    PAYPAL: 'paypal',
    STRIPE: 'stripe',
  },

  // Product status
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    OUT_OF_STOCK: 'out_of_stock',
  },

  // Notification types
  NOTIFICATION_TYPES: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
  },

  // JWT expiry
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
  },
};
