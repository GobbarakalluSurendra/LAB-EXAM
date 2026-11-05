const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const authFaculty = require('../middleware/authFaculty');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, facultyController.login);
router.post('/logout', authFaculty, facultyController.logout);
router.get('/profile', authFaculty, facultyController.getProfile);
router.put('/profile', authFaculty, facultyController.updateProfile);

module.exports = router;
