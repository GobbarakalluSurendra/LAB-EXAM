const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authFaculty = require('../middleware/authFaculty');

router.get('/:examId', authFaculty, activityController.getExamActivity);

module.exports = router;
