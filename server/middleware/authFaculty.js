const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');

const authFaculty = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid. Please login.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartlab_super_secret_faculty_jwt_key_2026_xyz!');

    const faculty = await Faculty.findById(decoded.id).select('-password');
    if (!faculty || !faculty.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Faculty account not found or disabled.'
      });
    }

    req.faculty = faculty;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please login again.',
      error: error.message
    });
  }
};

module.exports = authFaculty;
