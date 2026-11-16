const express = require('express');
const {
  controller,
  validateCreate,
  validateUpdate,
  validateResetPassword,
} = require('../controllers/userController');
const { auth, allowRoles, blockDemoUser } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.get('/directory', controller.directory);
router.use(allowRoles('admin'));
router.get('/', controller.list);
router.post('/', blockDemoUser, validateCreate, controller.create);
router.put('/:id', blockDemoUser, validateUpdate, controller.update);
router.post('/:id/reset-password', blockDemoUser, validateResetPassword, controller.resetPassword);
router.delete('/:id', blockDemoUser, controller.remove);

module.exports = router;
