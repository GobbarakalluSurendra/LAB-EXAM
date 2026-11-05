const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const authStudent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Student session token missing. Please login with your register number.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.STUDENT_JWT_SECRET || 'smartlab_super_secret_student_session_key_2026_abc!');

    const student = await Student.findById(decoded.studentId);
    if (!student || !student.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Student record not found or inactive.'
      });
    }

    req.student = student;
    req.studentExamId = decoded.examId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Student session expired or invalid. Please re-enter your register number.',
      error: error.message
    });
  }
};

module.exports = authStudent;
