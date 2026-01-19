const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { ensureWebToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/login-signature', authLimiter, authController.loginWithSignature);
router.get('/me', ensureWebToken, authController.me);
router.post('/refresh', authController.refresh);
router.post('/logout', ensureWebToken, authController.logout);

module.exports = router;


