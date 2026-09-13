const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const AppError = require('../utils/AppError');
const leadService = require('../services/leadService');

const PROPERTY_TYPES = ['1BHK', '2BHK', '3BHK', 'Plot', 'Villa', 'Commercial', 'Other'];
const SOURCES = ['Facebook', 'Google', 'Referral', 'Walk-in', 'Website', 'Other'];
const STATUSES = ['New', 'Contacted', 'Site Visit', 'Closed'];

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
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isLength({ max: 20 })
    .withMessage('Phone must not exceed 20 characters')
    .matches(/^[+\d][\d\s().-]*$/)
    .withMessage('Phone may contain only numbers and common separators')
    .custom((value) => value.replace(/\D/g, '').length >= 10)
    .withMessage('Phone must contain at least 10 digits'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be zero or greater'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
  body('propertyType').isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
  body('source').isIn(SOURCES).withMessage('Invalid source'),
  body('assignedAgent').optional().isMongoId().withMessage('Invalid assigned agent'),
];

const validateUpdate = [
  param('id').isMongoId().withMessage('Invalid lead id'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone cannot be empty')
    .isLength({ max: 20 })
    .withMessage('Phone must not exceed 20 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be zero or greater'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
  body('propertyType').optional().isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
  body('source').optional().isIn(SOURCES).withMessage('Invalid source'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('assignedAgent')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid assigned agent'),
];

const validateId = [param('id').isMongoId().withMessage('Invalid lead id')];

const validateNote = [
  param('id').isMongoId().withMessage('Invalid lead id'),
  body('content').trim().notEmpty().withMessage('Note content is required'),
  body('createdBy').optional().isString().withMessage('createdBy must be a string'),
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype === 'text/csv' && /\.csv$/i.test(file.originalname)) {
      return callback(null, true);
    }
    callback(new AppError('Only CSV files are accepted', 400, 'INVALID_FILE'));
  },
});

class LeadController {
  async list(req, res, next) {
    try {
      res.json({ success: true, data: await leadService.list(req.query, req.user) });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      res.json({ success: true, data: { lead: await leadService.get(req.params.id, req.user) } });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      res
        .status(201)
        .json({ success: true, data: { lead: await leadService.create(req.body, req.user) } });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      res.json({
        success: true,
        data: { lead: await leadService.update(req.params.id, req.body, req.user) },
      });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      await leadService.remove(req.params.id, req.user);
      res.json({ success: true, data: { message: 'Lead deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async note(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      res.json({
        success: true,
        data: { lead: await leadService.addNote(req.params.id, req.body.content, req.user) },
      });
    } catch (error) {
      next(error);
    }
  }

  async export(req, res, next) {
    try {
      const rows = await leadService.exportRows(req.query, req.user);
      const headers = [
        'Name',
        'Email',
        'Phone',
        'Budget',
        'Location',
        'PropertyType',
        'Source',
        'Status',
        'AssignedAgent',
        'FollowUpDate',
        'CreatedAt',
      ];
      const csv = [
        headers.join(','),
        ...rows.map((lead) =>
          [
            lead.name,
            lead.email,
            lead.phone,
            lead.budget,
            lead.location,
            lead.propertyType,
            lead.source,
            lead.status,
            lead.assignedAgent?.name,
            lead.followUpDate,
            lead.createdAt,
          ]
            .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');
      res.type('text/csv').attachment('leads.csv').send(csv);
    } catch (error) {
      next(error);
    }
  }

  async import(req, res, next) {
    try {
      if (!req.file) throw new AppError('CSV file is required', 400, 'FILE_REQUIRED');
      res.json({ success: true, data: await leadService.importCsv(req.file.buffer, req.user) });
    } catch (error) {
      next(error);
    }
  }

  template(req, res) {
    res
      .type('text/csv')
      .attachment('lead-import-template.csv')
      .send(
        'Name,Phone,Email,Budget,Location,PropertyType,Source,AssignedAgent\nExample Lead,9000000000,lead@example.com,5000000,Pune,2BHK,Website,agent@example.com\n'
      );
  }
}

module.exports = {
  controller: new LeadController(),
  validate,
  validateCreate,
  validateUpdate,
  validateId,
  validateNote,
  upload,
};
