const mongoose = require('mongoose');
const Examination = require('../models/Examination');
const QuestionSet = require('../models/QuestionSet');
const Assignment = require('../models/Assignment');
const StudentActivity = require('../models/StudentActivity');
const Student = require('../models/Student');

// GET /api/exams
const getExams = async (req, res) => {
  try {
    const { status, department, year, search } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;
    if (department && department !== 'ALL') query.department = department;
    if (year && year !== 'ALL') query.year = parseInt(year, 10);

    if (search) {
      query.title = new RegExp(search.trim(), 'i');
    }

    const exams = await Examination.find(query)
      .populate('subject', 'subjectName subjectCode department')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Enrich with dynamic counts
    const enrichedExams = await Promise.all(
      exams.map(async (exam) => {
        const [setCount, assignedCount, eligibleStudents] = await Promise.all([
          QuestionSet.countDocuments({ examination: exam._id, isActive: true }),
          Assignment.countDocuments({ examination: exam._id }),
          Student.countDocuments({
            isActive: true,
            ...(exam.department !== 'ALL' && { department: exam.department }),
            ...(exam.year && { year: exam.year }),
            ...(exam.section !== 'ALL' && { section: exam.section })
          })
        ]);

        const examObj = exam.toObject();
        examObj.numQuestionSets = setCount;
        examObj.assignedCount = assignedCount;
        examObj.eligibleStudentCount = eligibleStudents;
        return examObj;
      })
    );

    res.json({ success: true, exams: enrichedExams });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve examinations.', error: error.message });
  }
};

// GET /api/exams/:id
const getExamById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid examination ID.' });
    }

    const exam = await Examination.findById(id)
      .populate('subject')
      .populate('createdBy', 'name email');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const [setCount, assignedCount, activeLoginCount, eligibleCount] = await Promise.all([
      QuestionSet.countDocuments({ examination: exam._id, isActive: true }),
      Assignment.countDocuments({ examination: exam._id }),
      StudentActivity.countDocuments({ examination: exam._id }),
      Student.countDocuments({
        isActive: true,
        ...(exam.department !== 'ALL' && { department: exam.department }),
        ...(exam.year && { year: exam.year }),
        ...(exam.section !== 'ALL' && { section: exam.section })
      })
    ]);

    const examData = exam.toObject();
    examData.numQuestionSets = setCount;
    examData.assignedCount = assignedCount;
    examData.activeLoginCount = activeLoginCount;
    examData.eligibleCount = eligibleCount;

    res.json({ success: true, exam: examData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve examination.', error: error.message });
  }
};

// POST /api/exams
const createExam = async (req, res) => {
  try {
    const {
      title,
      subject,
      department,
      year,
      section,
      examDate,
      startTime,
      endTime,
      instructions,
      collegeName,
      labName,
      status
    } = req.body;

    if (!title || !subject || !department || !year || !section || !examDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, Subject, Department, Year, Section, Exam Date, Start Time, and End Time are required.'
      });
    }

    const exam = await Examination.create({
      title: title.trim(),
      subject,
      department: department.trim(),
      year: parseInt(year, 10),
      section: section.trim().toUpperCase(),
      examDate: new Date(examDate),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      instructions: instructions ? instructions.trim() : undefined,
      collegeName: collegeName ? collegeName.trim() : undefined,
      labName: labName ? labName.trim() : undefined,
      status: status || 'Draft',
      createdBy: req.faculty?._id
    });

    const populatedExam = await Examination.findById(exam._id).populate('subject');

    res.status(201).json({
      success: true,
      message: 'Examination created successfully.',
      exam: populatedExam
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create examination.', error: error.message });
  }
};

// PUT /api/exams/:id
const updateExam = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid examination ID.' });
    }

    const {
      title,
      subject,
      department,
      year,
      section,
      examDate,
      startTime,
      endTime,
      instructions,
      collegeName,
      labName,
      status
    } = req.body;

    const exam = await Examination.findById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    if (title) exam.title = title.trim();
    if (subject) exam.subject = subject;
    if (department) exam.department = department.trim();
    if (year) exam.year = parseInt(year, 10);
    if (section) exam.section = section.trim().toUpperCase();
    if (examDate) exam.examDate = new Date(examDate);
    if (startTime) exam.startTime = startTime.trim();
    if (endTime) exam.endTime = endTime.trim();
    if (instructions !== undefined) exam.instructions = instructions.trim();
    if (collegeName !== undefined) exam.collegeName = collegeName.trim();
    if (labName !== undefined) exam.labName = labName.trim();
    if (status) exam.status = status;

    await exam.save();

    const populatedExam = await Examination.findById(exam._id).populate('subject');

    res.json({
      success: true,
      message: 'Examination updated successfully.',
      exam: populatedExam
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update examination.', error: error.message });
  }
};

// PATCH /api/exams/:id/status (Quick Status Toggle)
const updateExamStatus = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid examination ID.' });
    }

    const { status } = req.body;
    if (!status || !['Draft', 'Scheduled', 'Active', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be one of: 'Draft', 'Scheduled', 'Active', 'Completed'."
      });
    }

    const exam = await Examination.findById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    if (status === 'Active') {
      const setCount = await QuestionSet.countDocuments({ examination: exam._id, isActive: true });
      if (setCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot activate examination with zero question sets. Please create question sets first.'
        });
      }
    }

    exam.status = status;
    await exam.save();

    res.json({
      success: true,
      message: `Examination status updated to '${status}'.`,
      exam
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update examination status.', error: error.message });
  }
};

// DELETE /api/exams/:id
const deleteExam = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid examination ID.' });
    }

    const exam = await Examination.findById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    await Promise.all([
      QuestionSet.deleteMany({ examination: exam._id }),
      Assignment.deleteMany({ examination: exam._id }),
      StudentActivity.deleteMany({ examination: exam._id }),
      Examination.findByIdAndDelete(exam._id)
    ]);

    res.json({ success: true, message: 'Examination and all associated records deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete examination.', error: error.message });
  }
};

module.exports = {
  getExams,
  getExamById,
  createExam,
  updateExam,
  updateExamStatus,
  deleteExam
};
