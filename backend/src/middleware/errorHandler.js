const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { message: 'A record with that value already exists', code: 'DUPLICATE_KEY' },
    });
  }

  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map(({ path, message }) => ({
      path,
      msg: message,
    }));
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details },
    });
  }

  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: { message: error.message, code: error.code },
    });
  }

  logger.error(error.stack || error.message);
  return res.status(500).json({
    success: false,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}

module.exports = errorHandler;
