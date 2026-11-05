const mongoose = require('mongoose');
const Student = require('../models/Student');
const Examination = require('../models/Examination');
const Assignment = require('../models/Assignment');
const QuestionSet = require('../models/QuestionSet');
const StudentActivity = require('../models/StudentActivity');
const excelService = require('../services/excelService');
const jwt = require('jsonwebtoken');

// Sign token for student session
const signStudentToken = (student, examId) => {
  return jwt.sign(
    { studentId: student._id, registerNumber: student.registerNumber, examId },
    process.env.STUDENT_JWT_SECRET || 'smartlab_super_secret_student_session_key_2026_abc!',
    { expiresIn: '8h' }
  );
};

// GET /api/students (Faculty)
const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', department = '', year = '', section = '' } = req.query;

    const query = { isActive: true };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { registerNumber: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    if (department && department !== 'ALL') query.department = department;
    if (year && year !== 'ALL') query.year = parseInt(year, 10);
    if (section && section !== 'ALL') query.section = section.toUpperCase();

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      Student.find(query).sort({ registerNumber: 1 }).skip(skip).limit(limitNum),
      Student.countDocuments(query)
    ]);

    res.json({
      success: true,
      students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve students.', error: error.message });
  }
};

// GET /api/students/:id (Faculty)
const getStudentById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student.', error: error.message });
  }
};

// POST /api/students (Faculty)
const createStudent = async (req, res) => {
  try {
    const { registerNumber, firstName, lastName, department, year, section, email } = req.body;

    if (!registerNumber || !firstName || !lastName || !department || !year || !section) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Register Number, First Name, Last Name, Department, Year, Section) are required.'
      });
    }

    const regUpper = registerNumber.trim().toUpperCase();
    const existing = await Student.findOne({ registerNumber: regUpper });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Student with register number ${regUpper} already exists.`
      });
    }

    const student = await Student.create({
      registerNumber: regUpper,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department.trim(),
      year: parseInt(year, 10),
      section: section.trim().toUpperCase(),
      email: email ? email.trim().toLowerCase() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add student.', error: error.message });
  }
};

// PUT /api/students/:id (Faculty)
const updateStudent = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    const { firstName, lastName, department, year, section, email, isActive } = req.body;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (firstName) student.firstName = firstName.trim();
    if (lastName) student.lastName = lastName.trim();
    if (department) student.department = department.trim();
    if (year) student.year = parseInt(year, 10);
    if (section) student.section = section.trim().toUpperCase();
    if (email !== undefined) student.email = email.trim().toLowerCase();
    if (isActive !== undefined) student.isActive = isActive;

    await student.save();

    res.json({
      success: true,
      message: 'Student updated successfully.',
      student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update student.', error: error.message });
  }
};

// DELETE /api/students/:id (Faculty)
const deleteStudent = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const assignmentCount = await Assignment.countDocuments({ student: student._id });
    if (assignmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete student who has existing examination assignments. Reset the exam assignments first or deactivate the student.'
      });
    }

    await Student.findByIdAndDelete(id);
    res.json({ success: true, message: 'Student removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete student.', error: error.message });
  }
};

// DELETE /api/students/all (Remove all students and reset assignments)
const deleteAllStudents = async (req, res) => {
  try {
    const deletedStudents = await Student.deleteMany({});
    const deletedAssignments = await Assignment.deleteMany({});
    const deletedActivity = await StudentActivity.deleteMany({});
    await Examination.updateMany({}, { isAssignmentPublished: false });

    res.json({
      success: true,
      message: `Successfully removed all ${deletedStudents.deletedCount} students and associated assignment records.`,
      deletedCount: deletedStudents.deletedCount
    });
  } catch (error) {
    console.error('[Delete All Students Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete all students.', error: error.message });
  }
};

// POST /api/students/import (Faculty Excel Import)
const importStudents = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload a valid Excel file (.xlsx or .xls).' });
    }

    const { department, year, section } = req.body;
    const result = await excelService.importStudentsFromExcel(req.file.buffer, {
      department,
      year: year ? parseInt(year, 10) : undefined,
      section
    });

    res.json({
      success: true,
      message: `Import completed: ${result.imported} students imported, ${result.failed} skipped/errors.`,
      result
    });
  } catch (error) {
    console.error('[Import Students Error]:', error.message || error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message || 'Failed to process student Excel file.', error: error.message });
  }
};

// GET /api/students/template (Download Excel Template)
const downloadTemplate = async (req, res) => {
  try {
    const workbook = await excelService.generateStudentTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="smartlab_students_template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate template.', error: error.message });
  }
};

// GET /api/students/active-exams (For Student Portal Examination Picker)
const getActiveExamsForStudent = async (req, res) => {
  try {
    const { registerNumber } = req.query;

    const filter = { status: 'Active' };

    let eligibleExams = await Examination.find(filter)
      .populate('subject', 'subjectName subjectCode')
      .sort({ examDate: -1 });

    if (registerNumber) {
      const regUpper = registerNumber.trim().toUpperCase();
      const student = await Student.findOne({ registerNumber: regUpper });
      if (student) {
        eligibleExams = eligibleExams.filter(e => {
          const deptMatch = e.department === 'ALL' || e.department === student.department;
          const yearMatch = !e.year || e.year === student.year;
          const secMatch = e.section === 'ALL' || e.section === student.section;
          return deptMatch && yearMatch && secMatch;
        });
      }
    }

    res.json({
      success: true,
      exams: eligibleExams
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active examinations.', error: error.message });
  }
};

// POST /api/students/login (Student Portal Login)
const studentLogin = async (req, res) => {
  try {
    const { registerNumber, examId } = req.body;

    if (!registerNumber) {
      return res.status(400).json({ success: false, message: 'Register Number is required.' });
    }

    const regUpper = registerNumber.trim().toUpperCase();
    const student = await Student.findOne({ registerNumber: regUpper, isActive: true });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Register Number '${regUpper}' not found or not registered in the system.`
      });
    }

    // If examId is provided and valid, authenticate directly for that exam
    if (examId && examId !== 'undefined' && mongoose.Types.ObjectId.isValid(examId)) {
      const exam = await Examination.findById(examId).populate('subject');
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Examination not found.' });
      }

      if (exam.status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: `This examination is currently '${exam.status}'. Students can only access 'Active' examinations.`
        });
      }

      // Check student eligibility
      const deptMatch = exam.department === 'ALL' || exam.department === student.department;
      const yearMatch = !exam.year || exam.year === student.year;
      const secMatch = exam.section === 'ALL' || exam.section === student.section;

      if (!deptMatch || !yearMatch || !secMatch) {
        return res.status(403).json({
          success: false,
          message: `You are not eligible for this examination. (Required: ${exam.department} Yr ${exam.year} Sec ${exam.section}; Your Record: ${student.department} Yr ${student.year} Sec ${student.section})`
        });
      }

      // Check if assignment exists
      const assignment = await Assignment.findOne({
        examination: examId,
        student: student._id
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'Question set has not been assigned to you yet. Please inform the lab faculty.'
        });
      }

      if (!assignment.isPublished) {
        return res.status(403).json({
          success: false,
          message: 'Assignments for this examination have not been published yet by faculty.'
        });
      }

      // Record / Update Student Activity
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || 'Unknown';

      await StudentActivity.findOneAndUpdate(
        { examination: examId, student: student._id },
        {
          $setOnInsert: {
            registerNumber: student.registerNumber,
            questionSet: assignment.questionSet,
            setName: assignment.setName,
            firstLoginAt: new Date()
          },
          $set: {
            lastAccessAt: new Date(),
            ipAddress: ip,
            userAgent
          },
          $inc: { accessCount: 1 }
        },
        { upsert: true, new: true }
      );

      const token = signStudentToken(student, examId);

      return res.json({
        success: true,
        message: 'Student logged in successfully.',
        token,
        student: {
          id: student._id,
          registerNumber: student.registerNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: student.fullName,
          department: student.department,
          year: student.year,
          section: student.section
        },
        exam: {
          id: exam._id,
          title: exam.title,
          subjectName: exam.subject?.subjectName,
          subjectCode: exam.subject?.subjectCode,
          collegeName: exam.collegeName,
          labName: exam.labName,
          startTime: exam.startTime,
          endTime: exam.endTime
        },
        assignedSet: {
          setNumber: assignment.setNumber,
          setName: assignment.setName
        }
      });
    }

    // If examId is not provided, find eligible active exams for this student
    const activeExams = await Examination.find({ status: 'Active' }).populate('subject');
    const eligibleExams = activeExams.filter(e => {
      const deptMatch = e.department === 'ALL' || e.department === student.department;
      const yearMatch = !e.year || e.year === student.year;
      const secMatch = e.section === 'ALL' || e.section === student.section;
      return deptMatch && yearMatch && secMatch;
    });

    if (eligibleExams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active laboratory examination found for your department and section right now.'
      });
    }

    // Return student details and list of active examinations
    res.json({
      success: true,
      requiresExamSelection: true,
      student: {
        id: student._id,
        registerNumber: student.registerNumber,
        fullName: student.fullName,
        department: student.department,
        year: student.year,
        section: student.section
      },
      availableExams: eligibleExams.map(e => ({
        id: e._id,
        title: e.title,
        subjectName: e.subject?.subjectName,
        subjectCode: e.subject?.subjectCode,
        startTime: e.startTime,
        endTime: e.endTime
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Student login failed.', error: error.message });
  }
};

// GET /api/students/my-assignment (Student Question Display)
const getMyAssignment = async (req, res) => {
  try {
    const student = req.student;
    const examId = req.studentExamId;

    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination session ID.' });
    }

    const exam = await Examination.findById(examId).populate('subject');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    if (exam.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Examination is currently '${exam.status}'. Questions can only be accessed while Active.`
      });
    }

    // Find the permanently assigned QuestionSet for this student
    const assignment = await Assignment.findOne({
      examination: examId,
      student: student._id
    }).populate('questionSet');

    if (!assignment || !assignment.questionSet) {
      return res.status(404).json({
        success: false,
        message: 'Assigned question set not found. Please contact your lab faculty.'
      });
    }

    // Update last access timestamp in StudentActivity
    await StudentActivity.updateOne(
      { examination: examId, student: student._id },
      { $set: { lastAccessAt: new Date() }, $inc: { accessCount: 1 } }
    );

    const qs = assignment.questionSet;

    res.json({
      success: true,
      student: {
        registerNumber: student.registerNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: student.fullName,
        department: student.department,
        year: student.year,
        section: student.section
      },
      examination: {
        id: exam._id,
        title: exam.title,
        subjectName: exam.subject?.subjectName,
        subjectCode: exam.subject?.subjectCode,
        collegeName: exam.collegeName,
        labName: exam.labName,
        examDate: exam.examDate,
        startTime: exam.startTime,
        endTime: exam.endTime,
        instructions: exam.instructions
      },
      assignedSet: {
        id: qs._id,
        setNumber: qs.setNumber,
        setName: qs.setName,
        totalMarks: qs.totalMarks,
        questions: (qs.questions || []).map(q => ({
          questionNumber: q.questionNumber,
          title: q.title,
          description: q.description,
          instructions: q.instructions || '',
          marks: q.marks || 0,
          attachments: q.attachments || []
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve assigned questions.', error: error.message });
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  deleteAllStudents,
  importStudents,
  downloadTemplate,
  getActiveExamsForStudent,
  studentLogin,
  getMyAssignment
};
