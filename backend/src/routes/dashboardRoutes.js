const express = require('express');
const { auth } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();
router.get('/stats', auth, dashboardController.validateStats, dashboardController.stats);

module.exports = router;
