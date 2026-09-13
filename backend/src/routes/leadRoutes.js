const express = require('express');
const {
  controller,
  validate,
  validateCreate,
  validateUpdate,
  validateId,
  validateNote,
  upload,
} = require('../controllers/leadController');
const { auth, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.get('/export', controller.export);
router.get('/import/template', controller.template);
router.post('/import', upload.single('file'), controller.import);
router.get('/', controller.list);
router.post('/', validateCreate, validate, controller.create);
router.get('/:id', validateId, validate, controller.get);
router.put('/:id', validateUpdate, validate, controller.update);
router.delete('/:id', allowRoles('admin'), validateId, validate, controller.remove);
router.post('/:id/notes', validateNote, validate, controller.note);

module.exports = router;
