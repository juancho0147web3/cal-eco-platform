const { validationResult } = require('express-validator');
const { ValidationError } = require('./errors');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));
    
    const error = new ValidationError('Validation failed');
    error.errors = formattedErrors;
    return next(error);
  }
  
  next();
}

function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}


function isValidTxHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000);
}

function validateNumericRange(value, min, max, fieldName = 'Value') {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  
  if (num < min || num > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
  
  return num;
}

module.exports = {
  handleValidationErrors,
  isValidEthereumAddress,
  isValidTxHash,
  sanitizeInput,
  validateNumericRange,
};
