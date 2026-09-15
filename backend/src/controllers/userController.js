const { body, param, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const userService = require('../services/userService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const validateCreate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['admin', 'agent']).withMessage('Role must be admin or agent'),
  validate,
];

const validateUpdate = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Invalid name'),
  body('role').optional().isIn(['admin', 'agent']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
  body('email').not().exists().withMessage('Email cannot be updated here'),
  body('password').not().exists().withMessage('Password cannot be updated here'),
  validate,
];

const validateResetPassword = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('temporaryPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Temporary password must be at least 8 characters'),
  validate,
];

class UserController {
  async directory(req, res, next) {
    try {
      res.json({ success: true, data: { users: await userService.directory() } });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      res.json({ success: true, data: { users: await userService.list() } });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      if (req.user.id === req.params.id && Object.prototype.hasOwnProperty.call(req.body, 'role')) {
        throw new AppError('Cannot change your own role', 400, 'SELF_ROLE_CHANGE');
      }
      const user = await userService.update(req.params.id, req.body);
      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await userService.resetPassword(req.params.id, req.body.temporaryPassword);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await userService.remove(req.params.id, req.user.id);
      res.json({
        success: true,
        data: { message: 'User deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  controller: new UserController(),
  validateCreate,
  validateUpdate,
  validateResetPassword,
};
