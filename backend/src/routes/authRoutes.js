const express = require('express');
const {
  controller,
  validateBootstrap,
  validateLogin,
  validateChangePassword,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter, bootstrapLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validation');

const router = express.Router();

router.post('/bootstrap', bootstrapLimiter, validateBootstrap, validate, controller.bootstrap);
router.post('/login', loginLimiter, validateLogin, validate, controller.login);
router.get('/me', auth, controller.me);
router.put('/change-password', auth, validateChangePassword, validate, controller.changePassword);

module.exports = router;
