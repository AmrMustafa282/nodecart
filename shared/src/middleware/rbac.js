const { AppError } = require('../utils/AppError');
const logger = require('../logger/logger');

/**
 * Role-Based Access Control Middleware
 * Checks if user has required role(s)
 *
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const rbacMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(req.user.role)) {
        logger.warn('Access denied', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
        });
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user owns the resource
 * @param {string} resourceUserIdField - Field name in req.params or req.body
 */
const ownershipMiddleware = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Check ownership
      if (resourceUserId !== req.user.id) {
        logger.warn('Ownership check failed', {
          userId: req.user.id,
          resourceUserId,
        });
        throw new AppError('Access denied', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = rbacMiddleware;
module.exports.ownershipMiddleware = ownershipMiddleware;
