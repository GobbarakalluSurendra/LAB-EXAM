const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authFaculty = require('../middleware/authFaculty');
const authStudent = require('../middleware/authStudent');
const upload = require('../middleware/upload');
const { loginLimiter } = require('../middleware/rateLimiter');

// Student Portal Routes (Public / Student authenticated)
router.post('/login', loginLimiter, studentController.studentLogin);
router.get('/active-exams', studentController.getActiveExamsForStudent);
router.get('/my-assignment', authStudent, studentController.getMyAssignment);

// Faculty Student Management Routes (Protected with authFaculty)
router.get('/', authFaculty, studentController.getStudents);
router.get('/template', authFaculty, studentController.downloadTemplate);
router.post('/import', authFaculty, upload.single('file'), studentController.importStudents);
router.get('/:id', authFaculty, studentController.getStudentById);
router.post('/', authFaculty, studentController.createStudent);
router.delete('/all', authFaculty, studentController.deleteAllStudents);
router.put('/:id', authFaculty, studentController.updateStudent);
router.delete('/:id', authFaculty, studentController.deleteStudent);

module.exports = router;
