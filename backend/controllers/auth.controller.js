const jwt = require('jsonwebtoken');
const ethUtil = require('ethereumjs-util');
const config = require('../config');
const UserModel = require('../models/user.model');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const { ValidationError, UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { isValidEthereumAddress } = require('../utils/validation');
const logger = require('../utils/logger');

const LOGIN_MESSAGE = 'Login Quant Fund';

const verifyWalletAddress = async (publicAddress, signature, message = LOGIN_MESSAGE) => {
  try {
    const msgBuffer = Buffer.from(message, 'utf8');
    const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
    const signatureBuffer = ethUtil.toBuffer(signature);
    const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
    const publicKey = ethUtil.ecrecover(
      msgHash,
      signatureParams.v,
      signatureParams.r,
      signatureParams.s
    );
    const addressBuffer = ethUtil.publicToAddress(publicKey);
    const address = ethUtil.bufferToHex(addressBuffer);
    return address.toLowerCase() === publicAddress.toLowerCase();
  } catch (error) {
    logger.error('Wallet verification error:', error);
    return false;
  }
};

exports.loginWithSignature = async (req, res, next) => {
  try {
    const { address, signature, referral_address } = req.body;
    
    if (!address || !signature) {
      throw new ValidationError('Address and signature are required');
    }
    if (!isValidEthereumAddress(address)) {
      throw new ValidationError('Invalid Ethereum address format');
    }

    if (config.blockedAddresses.includes(address.toLowerCase())) {
      logger.warn('Blocked address attempted login', { address });
      throw new ForbiddenError('This address is blocked from accessing the platform');
    }

    const isValid = await verifyWalletAddress(address, signature);
    if (!isValid) {
      logger.warn('Invalid wallet signature', { address });
      throw new UnauthorizedError('Wallet signature verification failed');
    }

    let users = await UserModel.getUsersDetailsAddress({ address });
    
    if (users.length === 0) {
      let referralId = null;
      if (referral_address) {
        if (!isValidEthereumAddress(referral_address)) {
          throw new ValidationError('Invalid referral address format');
        }
        const refUsers = await UserModel.getUserDetailsByAddress(referral_address);
        if (refUsers.length === 0) {
          throw new ValidationError('Invalid referral code');
        }
        referralId = refUsers[0].id;
      }
      
      const referralCode = 'REF' + Math.random().toString(36).substr(2, 5).toUpperCase();
      const saved = await UserModel.saveUserAddressDetails({ 
        address, 
        referral_id: referralId, 
        referral_code: referralCode 
      });
      
      users = [{ 
        id: saved.insertId, 
        address, 
        referral_code: referralCode, 
        is_admin: 0 
      }];
      
      logger.info('New user registered', { user_id: saved.insertId, address });
    }

    const user = users[0];
    const token = jwt.sign(
    { 
      id: user.id, 
      address: user.address,
      role: user.is_admin ? 'cpadmin' : 'user'
    },
    config.JWT_SECRET_KEY,
    { expiresIn: config.SESSION_EXPIRES_IN }
    );
    logger.info('User logged in successfully', { user_id: user.id, address: user.address });

    const { response, statusCode } = successResponse({
      id: user.id,
      address: user.address,
      referral_code: user.referral_code,
      authToken: token,
      is_admin: user.is_admin,
    }, 'Login successful');

    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const { response, statusCode } = successResponse({
      id: req.user_id,
      address: req.address,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (_req, res) => {
  const { response, statusCode } = errorResponse('Not implemented', 501);
  return res.status(statusCode).json(response);
};

exports.logout = async (_req, res) => {
  const { response, statusCode } = successResponse(null, 'Logout successful');
  return res.status(statusCode).json(response);
};
