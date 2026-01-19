const logger = require('../utils/logger');
const config = require('../config');
const { AppError } = require('../utils/errors');

function errorMiddleware(error, req, res, next) {

  let { statusCode = 500, message, isOperational = true } = error;
  
  if (!isOperational) {
    logger.error('Non-operational error occurred', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      user_id: req.user_id || 'anonymous',
    });
    
    if (config.nodeEnv === 'production') {
      message = 'An unexpected error occurred';
    }
  } else {
    logger.warn('Operational error', {
      statusCode,
      message,
      path: req.path,
      method: req.method,
      user_id: req.user_id || 'anonymous',
    });
  }
  
  const errorResponse = {
    success: false,
    status: statusCode,
    message: message || 'Internal server error',
  };
  
  if (error.errors && Array.isArray(error.errors)) {
    errorResponse.errors = error.errors;
  }
  
  if (config.nodeEnv === 'development' && error.stack) {
    errorResponse.stack = error.stack;
    errorResponse.details = error;
  }
  
  if (config.nodeEnv === 'development') {
    logger.debug('Full error details', {
      error: error,
      stack: error.stack,
    });
  }
  
  res.status(statusCode).json(errorResponse);
}

module.exports = errorMiddleware;
