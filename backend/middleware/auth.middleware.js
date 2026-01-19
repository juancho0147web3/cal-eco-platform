const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

function ensureWebToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    logger.warn('Authentication attempt without token', {
      ip: req.ip,
      path: req.path,
    });
    return next(new UnauthorizedError('No authentication token provided'));
  }
  jwt.verify(token, config.JWT_SECRET_KEY, async function (err, _data) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Expired token used', { ip: req.ip });
        return next(new UnauthorizedError('Authentication token has expired'));
      }
      if (err.name === 'JsonWebTokenError') {
        logger.warn('Invalid token used', { ip: req.ip });
        return next(new UnauthorizedError('Invalid authentication token'));
      }
      logger.error('JWT verification error', { error: err.message });
      return next(new UnauthorizedError('Token verification failed'));
    }
    try {
      const decoded = await jwt.decode(token, { complete: true, json: true });
      if (!decoded || !decoded.payload) {
        logger.error('Token decode failed - no payload');
        return next(new UnauthorizedError('Invalid token structure'));
      }
      
      req.user = decoded.payload;
      req.user_id = req.user.id;
      req.email = req.user.email;
      req.address = req.user.address;

      logger.debug('User authenticated successfully', { 
        user_id: req.user_id,
        address: req.address,
      });
      
      return next();
    } catch (error) {
      logger.error('Token decode error', { error: error.message });
      return next(new UnauthorizedError('Failed to decode token'));
    }
  });
}

function ensureWebTokenForAdmin(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    logger.warn('Admin authentication attempt without token', {
      ip: req.ip,
      path: req.path,
    });
    return next(new UnauthorizedError('No authentication token provided'));
  }
  jwt.verify(token, config.JWT_SECRET_KEY, async function (err, _data) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Authentication token has expired'));
      }
      if (err.name === 'JsonWebTokenError') {
        return next(new UnauthorizedError('Invalid authentication token'));
      }
      return next(new UnauthorizedError('Token verification failed'));
    }
    try {
      const decoded = await jwt.decode(token, { complete: true, json: true });
      
      if (!decoded || !decoded.payload) {
        return next(new UnauthorizedError('Invalid token structure'));
      }
      
      req.user = decoded.payload;
      
      if (req.user.role !== 'cpadmin') {
        logger.warn('Non-admin user attempted admin access', {
          user_id: req.user.id,
          ip: req.ip,
          path: req.path,
        });
        return next(new ForbiddenError('Admin access required'));
      }
      
      logger.debug('Admin authenticated successfully', { 
        user_id: req.user.id,
      });
      
      return next();
    } catch (error) {
      logger.error('Admin token decode error', { error: error.message });
      return next(new UnauthorizedError('Failed to decode token'));
    }
  });
}

module.exports = { ensureWebToken, ensureWebTokenForAdmin };


