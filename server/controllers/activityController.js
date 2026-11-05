const mongoose = require('mongoose');
const StudentActivity = require('../models/StudentActivity');
const Assignment = require('../models/Assignment');
const Examination = require('../models/Examination');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');

// GET /api/activity/:examId
const getExamActivity = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const { statusFilter = 'ALL', search = '' } = req.query;

    const exam = await Examination.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found.' });

    // Fetch all assignments for this examination
    const assignments = await Assignment.find({ examination: examId })
      .populate('student', 'firstName lastName department year section')
      .sort({ registerNumber: 1 });

    // Fetch all activity records for this examination
    const activities = await StudentActivity.find({ examination: examId });
    const activityMap = new Map();
    activities.forEach(act => {
      activityMap.set(act.student.toString(), act);
    });

    let records = assignments.map(a => {
      const act = activityMap.get(a.student?._id?.toString());
      const hasLoggedIn = Boolean(act && act.firstLoginAt);

      return {
        studentId: a.student?._id,
        registerNumber: a.registerNumber,
        studentName: a.student ? `${a.student.firstName} ${a.student.lastName}`.trim() : 'N/A',
        department: a.student?.department || exam.department,
        year: a.student?.year || exam.year,
        section: a.student?.section || exam.section,
        assignedSet: a.setName,
        setNumber: a.setNumber,
        hasLoggedIn,
        firstLoginAt: act?.firstLoginAt || null,
        lastAccessAt: act?.lastAccessAt || null,
        accessCount: act?.accessCount || 0,
        ipAddress: act?.ipAddress || '-'
      };
    });

    if (search) {
      const s = search.toLowerCase();
      records = records.filter(r =>
        r.registerNumber.toLowerCase().includes(s) ||
        r.studentName.toLowerCase().includes(s)
      );
    }

    if (statusFilter === 'LOGGED_IN') {
      records = records.filter(r => r.hasLoggedIn);
    } else if (statusFilter === 'NOT_LOGGED_IN') {
      records = records.filter(r => !r.hasLoggedIn);
    }

    const totalAssigned = assignments.length;
    const loggedInCount = activities.length;
    const notLoggedInCount = Math.max(0, totalAssigned - loggedInCount);

    res.json({
      success: true,
      stats: {
        totalAssigned,
        loggedInCount,
        notLoggedInCount,
        loginPercentage: totalAssigned > 0 ? Math.round((loggedInCount / totalAssigned) * 100) : 0
      },
      records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student activity.', error: error.message });
  }
};

// GET /api/reports/activity/:examId (Excel Export of Activity)
const exportActivityReport = async (req, res) => {
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

    const activities = await StudentActivity.find({ examination: examId });
    const actMap = new Map();
    activities.forEach(a => actMap.set(a.student.toString(), a));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Activity');

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `${exam.collegeName || 'SmartLab'} – Student Examination Activity Log`;
    worksheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 28;

    const headers = ['S.No', 'Register Number', 'Student Name', 'Assigned Set', 'Login Status', 'First Login', 'Last Access', 'Access Count'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    worksheet.columns = [
      { key: 'sno', width: 8 },
      { key: 'regNo', width: 18 },
      { key: 'name', width: 25 },
      { key: 'set', width: 16 },
      { key: 'status', width: 16 },
      { key: 'firstLogin', width: 24 },
      { key: 'lastAccess', width: 24 },
      { key: 'count', width: 14 }
    ];

    assignments.forEach((a, i) => {
      const act = actMap.get(a.student?._id?.toString());
      worksheet.addRow({
        sno: i + 1,
        regNo: a.registerNumber,
        name: a.student ? `${a.student.firstName} ${a.student.lastName}`.trim() : 'N/A',
        set: a.setName,
        status: act ? 'LOGGED IN' : 'NOT LOGGED IN',
        firstLogin: act?.firstLoginAt ? new Date(act.firstLoginAt).toLocaleString() : '-',
        lastAccess: act?.lastAccessAt ? new Date(act.lastAccessAt).toLocaleString() : '-',
        count: act?.accessCount || 0
      });
    });

    const safeTitle = (exam.title || 'smartlab_activity').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_activity.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export activity report.', error: error.message });
  }
};

module.exports = {
  getExamActivity,
  exportActivityReport
};
