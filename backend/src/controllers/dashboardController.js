const dashboardService = require('../services/dashboardService');

class DashboardController {
  async stats(req, res, next) {
    try {
      const stats = await dashboardService.stats(req.user);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
