const { validationResult } = require('express-validator');
const { AppError } = require('../utils/AppError');

/**
 * Validation middleware - checks express-validator results
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    throw new AppError('Validation failed', 400, extractedErrors);
  }

  next();
};

module.exports = validateRequest;
