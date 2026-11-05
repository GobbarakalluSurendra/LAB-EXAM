const Faculty = require('../models/Faculty');
const jwt = require('jsonwebtoken');

const signToken = (faculty) => {
  return jwt.sign(
    { id: faculty._id, email: faculty.email, role: faculty.role, name: faculty.name },
    process.env.JWT_SECRET || 'smartlab_super_secret_faculty_jwt_key_2026_xyz!',
    { expiresIn: '24h' }
  );
};

// POST /api/faculty/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const faculty = await Faculty.findOne({ email: email.toLowerCase().trim() });
    if (!faculty) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await faculty.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!faculty.isActive) {
      return res.status(403).json({ success: false, message: 'Faculty account has been deactivated.' });
    }

    const token = signToken(faculty);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        role: faculty.role,
        department: faculty.department
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
  }
};

// POST /api/faculty/logout
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logout successful.' });
};

// GET /api/faculty/profile
const getProfile = async (req, res) => {
  res.json({
    success: true,
    faculty: req.faculty
  });
};

// PUT /api/faculty/profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, phone, currentPassword, newPassword } = req.body;
    const faculty = await Faculty.findById(req.faculty._id);

    if (name) faculty.name = name.trim();
    if (department) faculty.department = department.trim();
    if (phone !== undefined) faculty.phone = phone.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set new password.' });
      }
      const isMatch = await faculty.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      faculty.password = newPassword;
    }

    await faculty.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        role: faculty.role,
        department: faculty.department,
        phone: faculty.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile.', error: error.message });
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  updateProfile
};
