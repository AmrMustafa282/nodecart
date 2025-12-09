const rateLimit = require('express-rate-limit');
const logger = require('../logger/logger');

/**
 * Create rate limiter (in-memory for simplicity)
 * @param {Object} options - Rate limiter options
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: message,
      });
    },
  });
};

// Predefined rate limiters - created lazily to avoid initialization errors
const rateLimiters = {
  get auth() {
    return createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many authentication attempts, please try again later',
    });
  },

  get api() {
    return createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
  },

  get public() {
    return createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 300,
    });
  },
};

module.exports = createRateLimiter;
module.exports.rateLimiters = rateLimiters;
