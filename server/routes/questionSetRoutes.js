const express = require('express');
const router = express.Router();
const questionSetController = require('../controllers/questionSetController');
const authFaculty = require('../middleware/authFaculty');
const upload = require('../middleware/upload');

router.get('/exam/:examId', authFaculty, questionSetController.getQuestionSetsByExam);
router.get('/template', authFaculty, questionSetController.downloadTemplate);
router.post('/import/:examId', authFaculty, upload.single('file'), questionSetController.importQuestionSets);
router.post('/copy-from-exam', authFaculty, questionSetController.copySetsFromExam);
router.get('/:id', authFaculty, questionSetController.getQuestionSetById);
router.post('/', authFaculty, questionSetController.createQuestionSet);
router.put('/:id', authFaculty, questionSetController.updateQuestionSet);
router.post('/duplicate/:id', authFaculty, questionSetController.duplicateQuestionSet);
router.delete('/:id', authFaculty, questionSetController.deleteQuestionSet);

module.exports = router;
