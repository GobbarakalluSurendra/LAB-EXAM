const Subject = require('../models/Subject');
const Examination = require('../models/Examination');

// GET /api/subjects
const getSubjects = async (req, res) => {
  try {
    const { department, year, semester, search } = req.query;
    const query = {};

    if (department && department !== 'ALL') query.department = department;
    if (year && year !== 'ALL') query.year = parseInt(year, 10);
    if (semester && semester !== 'ALL') query.semester = parseInt(semester, 10);

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { subjectName: searchRegex },
        { subjectCode: searchRegex }
      ];
    }

    const subjects = await Subject.find(query).sort({ department: 1, year: 1, subjectName: 1 });
    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve subjects.', error: error.message });
  }
};

// GET /api/subjects/:id
const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }
    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve subject.', error: error.message });
  }
};

// POST /api/subjects
const createSubject = async (req, res) => {
  try {
    const { subjectName, subjectCode, department, year, semester, description } = req.body;

    if (!subjectName || !subjectCode || !department || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Subject Name, Subject Code, Department, Year, and Semester are required.'
      });
    }

    const codeUpper = subjectCode.trim().toUpperCase();
    const existing = await Subject.findOne({ subjectCode: codeUpper });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Subject with code '${codeUpper}' already exists.`
      });
    }

    const subject = await Subject.create({
      subjectName: subjectName.trim(),
      subjectCode: codeUpper,
      department: department.trim(),
      year: parseInt(year, 10),
      semester: parseInt(semester, 10),
      description: description ? description.trim() : ''
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      subject
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create subject.', error: error.message });
  }
};

// PUT /api/subjects/:id
const updateSubject = async (req, res) => {
  try {
    const { subjectName, subjectCode, department, year, semester, description } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    if (subjectCode && subjectCode.trim().toUpperCase() !== subject.subjectCode) {
      const codeUpper = subjectCode.trim().toUpperCase();
      const existing = await Subject.findOne({ subjectCode: codeUpper });
      if (existing) {
        return res.status(400).json({ success: false, message: `Subject code '${codeUpper}' is already taken.` });
      }
      subject.subjectCode = codeUpper;
    }

    if (subjectName) subject.subjectName = subjectName.trim();
    if (department) subject.department = department.trim();
    if (year) subject.year = parseInt(year, 10);
    if (semester) subject.semester = parseInt(semester, 10);
    if (description !== undefined) subject.description = description.trim();

    await subject.save();

    res.json({
      success: true,
      message: 'Subject updated successfully.',
      subject
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update subject.', error: error.message });
  }
};

// DELETE /api/subjects/:id
const deleteSubject = async (req, res) => {
  try {
    const examCount = await Examination.countDocuments({ subject: req.params.id });
    if (examCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete subject because ${examCount} examination(s) are linked to it.`
      });
    }

    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    res.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete subject.', error: error.message });
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
};
