const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authFaculty = require('../middleware/authFaculty');

router.get('/', authFaculty, examController.getExams);
router.get('/:id', authFaculty, examController.getExamById);
router.post('/', authFaculty, examController.createExam);
router.put('/:id', authFaculty, examController.updateExam);
router.patch('/:id/status', authFaculty, examController.updateExamStatus);
router.delete('/:id', authFaculty, examController.deleteExam);

module.exports = router;
