const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authFaculty = require('../middleware/authFaculty');

router.get('/', authFaculty, subjectController.getSubjects);
router.get('/:id', authFaculty, subjectController.getSubjectById);
router.post('/', authFaculty, subjectController.createSubject);
router.put('/:id', authFaculty, subjectController.updateSubject);
router.delete('/:id', authFaculty, subjectController.deleteSubject);

module.exports = router;
