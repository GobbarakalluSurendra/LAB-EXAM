const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const QuestionSet = require('../models/QuestionSet');
const Examination = require('../models/Examination');
const Student = require('../models/Student');
const AssignmentHistory = require('../models/AssignmentHistory');
const assignmentEngine = require('../services/assignmentEngine');
const excelService = require('../services/excelService');

// POST /api/assignments/generate/:examId
const generate = async (req, res) => {
  try {
    const { preview = false, autoPublish = false } = req.body;
    const examId = req.params.examId;

    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const facultyId = req.faculty?._id;

    const result = await assignmentEngine.generateAssignments({
      examId,
      facultyId,
      isPreview: Boolean(preview),
      autoPublish: Boolean(autoPublish)
    });

    res.json({
      success: true,
      message: preview ? 'Assignment preview generated.' : 'Balanced assignments generated successfully.',
      ...result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/assignments/:examId
const getAssignmentsByExam = async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '', setNumber = '' } = req.query;
    const examId = req.params.examId;

    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const query = { examination: examId };

    if (setNumber && setNumber !== 'ALL') {
      query.setNumber = parseInt(setNumber, 10);
    }

    if (search) {
      query.registerNumber = new RegExp(search.trim(), 'i');
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('student', 'firstName lastName department year section email')
        .populate('questionSet', 'setName setNumber totalMarks')
        .sort({ registerNumber: 1 })
        .skip(skip)
        .limit(limitNum),
      Assignment.countDocuments(query)
    ]);

    res.json({
      success: true,
      assignments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve assignments.', error: error.message });
  }
};

// GET /api/assignments/distribution/:examId
const getDistributionByExam = async (req, res) => {
  try {
    const examId = req.params.examId;

    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const [sets, assignments, exam] = await Promise.all([
      QuestionSet.find({ examination: examId, isActive: true }).sort({ setNumber: 1 }),
      Assignment.find({ examination: examId }),
      Examination.findById(examId)
    ]);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const stats = assignmentEngine.calculateDistributionStats(assignments, sets);

    // Calculate eligible student count
    const studentFilter = { isActive: true };
    if (exam.department && exam.department !== 'ALL') studentFilter.department = exam.department;
    if (exam.year) studentFilter.year = exam.year;
    if (exam.section && exam.section !== 'ALL') studentFilter.section = exam.section;

    const totalEligible = await Student.countDocuments(studentFilter);
    const unassignedCount = Math.max(0, totalEligible - assignments.length);

    res.json({
      success: true,
      stats: {
        ...stats,
        totalEligible,
        unassignedCount,
        isPublished: exam.isAssignmentPublished,
        examStatus: exam.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate distribution.', error: error.message });
  }
};

// POST /api/assignments/publish/:examId
const publish = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const result = await assignmentEngine.publishAssignments({
      examId,
      facultyId: req.faculty?._id
    });

    res.json({
      success: true,
      message: `Published assignments for ${result.publishedCount} students successfully. Students can now view their sets.`,
      ...result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/assignments/reset/:examId
const reset = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const { reason } = req.body;
    const result = await assignmentEngine.resetAssignments({
      examId,
      facultyId: req.faculty?._id,
      reason
    });

    res.json({
      success: true,
      message: `Assignments reset successfully (${result.deletedCount} assignments cleared).`,
      ...result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/assignments/assign-unassigned/:examId
const assignUnassigned = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const result = await assignmentEngine.assignUnassignedStudents({
      examId,
      facultyId: req.faculty?._id
    });

    res.json({
      success: true,
      message: result.newlyAssignedCount > 0
        ? `Assigned ${result.newlyAssignedCount} new student(s) while preserving existing assignments.`
        : 'All eligible students already have assignments.',
      ...result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/reports/assignments/:examId (Excel Export)
const exportAssignments = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const exam = await Examination.findById(examId).populate('subject');
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found.' });

    const assignments = await Assignment.find({ examination: examId })
      .populate('student')
      .sort({ registerNumber: 1 });

    const workbook = await excelService.exportAssignmentsToExcel(exam, assignments);

    const safeTitle = (exam.title || 'smartlab_exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_assignments.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export assignments.', error: error.message });
  }
};

// GET /api/assignments/history/:examId
const getHistory = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const history = await AssignmentHistory.find({ examination: examId })
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve assignment history.', error: error.message });
  }
};

module.exports = {
  generate,
  getAssignmentsByExam,
  getDistributionByExam,
  publish,
  reset,
  assignUnassigned,
  exportAssignments,
  getHistory
};
