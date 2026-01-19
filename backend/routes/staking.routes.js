const express = require('express');
const router = express.Router();
const stakingController = require('../controllers/staking.controller');
const { ensureWebToken } = require('../middleware/auth.middleware');
const { stakingLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/', ensureWebToken, stakingLimiter, stakingController.create);
router.get('/', ensureWebToken, stakingController.list);
router.post('/claim', ensureWebToken, stakingLimiter, stakingController.claim);
router.post('/sell', ensureWebToken, stakingLimiter, stakingController.sell);

module.exports = router;


