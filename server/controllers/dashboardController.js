const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Examination = require('../models/Examination');
const QuestionSet = require('../models/QuestionSet');
const Assignment = require('../models/Assignment');
const StudentActivity = require('../models/StudentActivity');
const AssignmentHistory = require('../models/AssignmentHistory');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalSubjects,
      totalExaminations,
      totalQuestionSets,
      totalAssignments,
      recentExams,
      recentActivity,
      activeExams
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Subject.countDocuments(),
      Examination.countDocuments(),
      QuestionSet.countDocuments({ isActive: true }),
      Assignment.countDocuments(),
      Examination.find()
        .populate('subject', 'subjectName subjectCode')
        .sort({ createdAt: -1 })
        .limit(5),
      AssignmentHistory.find()
        .populate('examination', 'title')
        .populate('performedBy', 'name email')
        .sort({ timestamp: -1 })
        .limit(8),
      Examination.find({ status: 'Active' })
        .populate('subject', 'subjectName')
    ]);

    // Active exams breakdown
    const activeExamStats = await Promise.all(
      activeExams.map(async (exam) => {
        const [assigned, loggedIn, sets] = await Promise.all([
          Assignment.countDocuments({ examination: exam._id }),
          StudentActivity.countDocuments({ examination: exam._id }),
          QuestionSet.countDocuments({ examination: exam._id, isActive: true })
        ]);
        return {
          id: exam._id,
          title: exam.title,
          subject: exam.subject?.subjectName,
          assigned,
          loggedIn,
          sets
        };
      })
    );

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalSubjects,
        totalExaminations,
        totalQuestionSets,
        totalAssignments,
        unassignedStudents: Math.max(0, totalStudents - totalAssignments)
      },
      recentExams,
      recentActivity,
      activeExamStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard stats.', error: error.message });
  }
};

module.exports = {
  getDashboardStats
};
