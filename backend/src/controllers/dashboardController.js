const { query, validationResult } = require('express-validator');
const dashboardService = require('../services/dashboardService');

const validateStats = [
  query('assignedAgent').optional().isMongoId().withMessage('Invalid assigned agent'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  },
];

class DashboardController {
  async stats(req, res, next) {
    try {
      const stats = await dashboardService.stats(req.user, req.query.assignedAgent);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
module.exports.validateStats = validateStats;
