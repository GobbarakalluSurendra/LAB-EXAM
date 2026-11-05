const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const activityController = require('../controllers/activityController');
const authFaculty = require('../middleware/authFaculty');

router.get('/assignments/:examId', authFaculty, assignmentController.exportAssignments);
router.get('/activity/:examId', authFaculty, activityController.exportActivityReport);

module.exports = router;
