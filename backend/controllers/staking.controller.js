const UserModel = require('../models/user.model');
const { successResponse } = require('../utils/response');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { validateNumericRange } = require('../utils/validation');
const logger = require('../utils/logger');

exports.create = async (req, res, next) => {
  try {
    req.body.user_id = req.user_id;
    req.body.address = req.address;
    const check = await UserModel.checkPeriodId(req.body);
    if (check.length === 0) {
      throw new NotFoundError('Invalid staking plan selected');
    }
    
    req.body.token_amount = check[0].price;
    req.body.reward_token = check[0].token;
    validateNumericRange(req.body.token_amount, 0.01, 1000000, 'Token amount');
    const result = await UserModel.addStaking(req.body);
    logger.info('Staking created', { 
      user_id: req.user_id, 
      staking_id: result.insertId,
      amount: req.body.token_amount 
    });
    
    const { response, statusCode } = successResponse(
      { id: result.insertId },
      'Staking created successfully'
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const data = await UserModel.getstakingHistory({ user_id: req.user_id });
    
    const { response, statusCode } = successResponse(
      data,
      'Staking history retrieved successfully'
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

exports.claim = async (req, res, next) => {
  try {
    const body = { ...req.body, user_id: req.user_id };
    const rewardCheck = await UserModel.RewardClaimCheck(body);
    if (rewardCheck.length === 0 || rewardCheck[0].isClaimAvailable == 0) {
      throw new ValidationError('Claim not available yet. Please wait until the staking period ends.');
    }
    
    const quantity = await UserModel.stakingQuantity(body);
    if (quantity.length === 0) {
      throw new NotFoundError('Staking record not found');
    }
    
    const token = parseFloat(quantity[0].reward_token) * parseFloat(quantity[0].remaining_quantity);
    if (token <= 0) {
      throw new ValidationError('No rewards available to claim');
    }
    
    await UserModel.SingalRewardClaim({ ...body, token });
    logger.info('Reward claimed', {
      user_id: req.user_id,
      staking_id: body.id,
      reward_amount: token
    });
    
    const { response, statusCode } = successResponse(
      { claimed_amount: token },
      'Reward claimed successfully'
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

exports.sell = async (req, res, next) => {
  try {
    const body = { ...req.body, user_id: req.user_id };
    const check = await UserModel.checkSellPlan(body);
    if (check.length === 0) {
      throw new NotFoundError('Staking record not found or already sold');
    }
    
    const rewardAmount = parseFloat(check[0].reward_token) * parseFloat(check[0].remaining_quantity);
    await UserModel.SellPlan({ ...body, reward_token: rewardAmount });
    
    logger.info('Staking sold', {
      user_id: req.user_id,
      staking_id: body.id,
      reward_amount: rewardAmount
    });
    
    const { response, statusCode } = successResponse(
      { sold_amount: rewardAmount },
      'Staking sold successfully'
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};


