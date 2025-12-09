/**
 * Standard response formatter for consistent API responses
 */
const responseFormatter = {
  /**
   * Success response
   */
  success: (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  /**
   * Error response
   */
  error: (res, message = 'Error', statusCode = 500, errors = null) => {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  },

  /**
   * Paginated response
   */
  paginated: (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  },
};

module.exports = responseFormatter;
