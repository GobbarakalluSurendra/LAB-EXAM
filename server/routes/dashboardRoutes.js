const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authFaculty = require('../middleware/authFaculty');

router.get('/stats', authFaculty, dashboardController.getDashboardStats);

module.exports = router;
