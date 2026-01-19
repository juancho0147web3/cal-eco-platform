const express = require('express');
const router = express.Router();
const controller = require('../controllers/withdrawal.controller');
const { ensureWebToken } = require('../middleware/auth.middleware');
const { withdrawalLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/', ensureWebToken, withdrawalLimiter, controller.request);
router.get('/', ensureWebToken, controller.list);
router.delete('/:id', ensureWebToken, controller.cancel);

module.exports = router;


