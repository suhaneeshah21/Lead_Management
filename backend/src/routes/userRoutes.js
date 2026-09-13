const express = require('express');
const {
  controller,
  validateCreate,
  validateUpdate,
  validateResetPassword,
} = require('../controllers/userController');
const { auth, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.get('/directory', controller.directory);
router.use(allowRoles('admin'));
router.get('/', controller.list);
router.post('/', validateCreate, controller.create);
router.put('/:id', validateUpdate, controller.update);
router.post('/:id/reset-password', validateResetPassword, controller.resetPassword);
router.delete('/:id', controller.remove);

module.exports = router;
