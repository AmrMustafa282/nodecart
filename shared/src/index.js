// Shared library exports
module.exports = {
  // Logger
  logger: require('./logger/logger'),

  // Middleware
  authMiddleware: require('./middleware/auth'),
  rbacMiddleware: require('./middleware/rbac'),
  errorHandler: require('./middleware/errorHandler'),
  rateLimiter: require('./middleware/rateLimiter'),
  rateLimiters: require('./middleware/rateLimiter').rateLimiters,
  validateRequest: require('./middleware/validator'),

  // Event Bus
  EventBus: require('./events/eventBus'),
  eventTypes: require('./events/eventTypes'),

  // Utilities
  responseFormatter: require('./utils/responseFormatter'),
  AppError: require('./utils/AppError').AppError,
  asyncHandler: require('./utils/asyncHandler'),
  constants: require('./utils/constants'),
};
