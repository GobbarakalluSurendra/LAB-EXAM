const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authFaculty = require('../middleware/authFaculty');

router.post('/generate/:examId', authFaculty, assignmentController.generate);
router.get('/distribution/:examId', authFaculty, assignmentController.getDistributionByExam);
router.get('/history/:examId', authFaculty, assignmentController.getHistory);
router.post('/publish/:examId', authFaculty, assignmentController.publish);
router.post('/reset/:examId', authFaculty, assignmentController.reset);
router.post('/assign-unassigned/:examId', authFaculty, assignmentController.assignUnassigned);
router.get('/:examId', authFaculty, assignmentController.getAssignmentsByExam);

module.exports = router;
