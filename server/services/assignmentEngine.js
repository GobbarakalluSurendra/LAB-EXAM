const crypto = require('crypto');
const Assignment = require('../models/Assignment');
const QuestionSet = require('../models/QuestionSet');
const Student = require('../models/Student');
const Examination = require('../models/Examination');
const AssignmentHistory = require('../models/AssignmentHistory');

// In-memory mutex per examination to prevent concurrent generation race conditions
const examLocks = new Map();

/**
 * Modern Fisher-Yates shuffle using cryptographically secure random integers
 */
function secureShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pure balanced distribution calculation for preview or direct assignment
 * @param {Array} students - Array of student objects
 * @param {Array} sets - Array of question set objects
 * @returns {Array} - Array of { student, questionSet }
 */
function computeBalancedDistribution(students, sets) {
  if (!students || students.length === 0) {
    throw new Error('No eligible students found for this examination.');
  }
  if (!sets || sets.length === 0) {
    throw new Error('No active question sets found for this examination.');
  }

  // 1. Shuffle both question sets and students randomly
  const shuffledSets = secureShuffle(sets);
  const shuffledStudents = secureShuffle(students);

  // 2. Distribute students across shuffled sets using round-robin allocation
  const assignments = [];
  const numSets = shuffledSets.length;

  for (let i = 0; i < shuffledStudents.length; i++) {
    const assignedSet = shuffledSets[i % numSets];
    assignments.push({
      student: shuffledStudents[i],
      questionSet: assignedSet,
      setNumber: assignedSet.setNumber,
      setName: assignedSet.setName
    });
  }

  return assignments;
}

/**
 * Calculate distribution metrics and verify balanced condition
 */
function calculateDistributionStats(assignments, sets) {
  const setCounts = {};
  sets.forEach(s => {
    setCounts[s.setNumber] = {
      setNumber: s.setNumber,
      setName: s.setName,
      count: 0
    };
  });

  assignments.forEach(a => {
    const setNum = a.setNumber || a.questionSet?.setNumber;
    if (setCounts[setNum]) {
      setCounts[setNum].count++;
    }
  });

  const countsArray = Object.values(setCounts).map(s => s.count);
  const max = countsArray.length > 0 ? Math.max(...countsArray) : 0;
  const min = countsArray.length > 0 ? Math.min(...countsArray) : 0;
  const diff = max - min;

  return {
    totalStudents: assignments.length,
    totalSets: sets.length,
    setDistribution: Object.values(setCounts),
    maxAssigned: max,
    minAssigned: min,
    difference: diff,
    isBalanced: diff <= 1
  };
}

/**
 * Generates assignments for an examination
 */
async function generateAssignments({ examId, facultyId, isPreview = false, autoPublish = false }) {
  const lockKey = examId.toString();
  if (examLocks.get(lockKey)) {
    throw new Error('Assignment generation is already in progress for this examination. Please wait.');
  }
  examLocks.set(lockKey, true);

  try {
    const exam = await Examination.findById(examId);
    if (!exam) {
      throw new Error('Examination not found.');
    }

    // Check if assignments already exist
    const existingCount = await Assignment.countDocuments({ examination: examId });
    if (existingCount > 0 && !isPreview) {
      throw new Error('Assignments have already been generated for this examination. Please reset assignments before generating new ones.');
    }

    // Fetch active question sets
    const questionSets = await QuestionSet.find({ examination: examId, isActive: true }).sort({ setNumber: 1 });
    if (!questionSets || questionSets.length === 0) {
      throw new Error('No active question sets available. Please create at least one question set.');
    }

    // Fetch eligible students
    const studentFilter = { isActive: true };
    if (exam.department && exam.department !== 'ALL') {
      studentFilter.department = exam.department;
    }
    if (exam.year) {
      studentFilter.year = exam.year;
    }
    if (exam.section && exam.section !== 'ALL') {
      studentFilter.section = exam.section;
    }

    const students = await Student.find(studentFilter).sort({ registerNumber: 1 });
    if (students.length === 0) {
      throw new Error(`No students found matching Department: ${exam.department}, Year: ${exam.year}, Section: ${exam.section}.`);
    }

    // Run the balanced assignment algorithm
    const computed = computeBalancedDistribution(students, questionSets);
    const stats = calculateDistributionStats(computed, questionSets);

    if (isPreview) {
      return {
        preview: true,
        stats,
        assignments: computed.map(c => ({
          studentId: c.student._id,
          registerNumber: c.student.registerNumber,
          studentName: `${c.student.firstName} ${c.student.lastName}`.trim(),
          department: c.student.department,
          year: c.student.year,
          section: c.student.section,
          setNumber: c.setNumber,
          setName: c.setName,
          questionSetId: c.questionSet._id
        }))
      };
    }

    // Save to database
    const assignmentDocs = computed.map(c => ({
      examination: examId,
      student: c.student._id,
      registerNumber: c.student.registerNumber,
      questionSet: c.questionSet._id,
      setNumber: c.setNumber,
      setName: c.setName,
      isPublished: autoPublish,
      assignedBy: facultyId,
      assignedAt: new Date()
    }));

    await Assignment.insertMany(assignmentDocs, { ordered: true });

    // Update examination state
    exam.numQuestionSets = questionSets.length;
    exam.assignedCount = assignmentDocs.length;
    if (autoPublish) {
      exam.isAssignmentPublished = true;
    }
    await exam.save();

    // Log in history
    await AssignmentHistory.create({
      examination: examId,
      action: 'GENERATE',
      performedBy: facultyId,
      details: {
        totalStudents: students.length,
        totalSets: questionSets.length,
        isPublished: autoPublish,
        stats
      },
      note: `Generated balanced assignment for ${students.length} students across ${questionSets.length} sets.`
    });

    return {
      success: true,
      stats,
      assignedCount: assignmentDocs.length,
      isPublished: autoPublish
    };
  } finally {
    examLocks.delete(lockKey);
  }
}

/**
 * Assigns only newly added or unassigned students without modifying existing assignments
 */
async function assignUnassignedStudents({ examId, facultyId }) {
  const lockKey = examId.toString();
  if (examLocks.get(lockKey)) {
    throw new Error('An assignment operation is already in progress for this examination.');
  }
  examLocks.set(lockKey, true);

  try {
    const exam = await Examination.findById(examId);
    if (!exam) throw new Error('Examination not found.');

    const questionSets = await QuestionSet.find({ examination: examId, isActive: true }).sort({ setNumber: 1 });
    if (!questionSets.length) throw new Error('No active question sets found.');

    // Find all currently assigned student IDs for this exam
    const existingAssignments = await Assignment.find({ examination: examId });
    const assignedStudentIds = new Set(existingAssignments.map(a => a.student.toString()));

    // Find all eligible students
    const studentFilter = { isActive: true };
    if (exam.department && exam.department !== 'ALL') studentFilter.department = exam.department;
    if (exam.year) studentFilter.year = exam.year;
    if (exam.section && exam.section !== 'ALL') studentFilter.section = exam.section;

    const allStudents = await Student.find(studentFilter);
    const unassignedStudents = allStudents.filter(s => !assignedStudentIds.has(s._id.toString()));

    if (unassignedStudents.length === 0) {
      return {
        success: true,
        message: 'All eligible students already have assignments. No unassigned students found.',
        assignedCount: 0
      };
    }

    // Build current set count map
    const setCounts = new Map();
    questionSets.forEach(qs => {
      setCounts.set(qs._id.toString(), {
        questionSet: qs,
        count: 0
      });
    });

    existingAssignments.forEach(a => {
      const qsId = a.questionSet.toString();
      if (setCounts.has(qsId)) {
        setCounts.get(qsId).count++;
      }
    });

    // Shuffle unassigned students randomly
    const shuffledUnassigned = secureShuffle(unassignedStudents);
    const newAssignmentDocs = [];

    // Assign each student to the set with the minimal current count
    for (const student of shuffledUnassigned) {
      // Find sets with minimum count
      const setsArray = Array.from(setCounts.values());
      const minCount = Math.min(...setsArray.map(s => s.count));
      const candidateSets = setsArray.filter(s => s.count === minCount);

      // Randomly pick one among the candidate sets
      const chosen = candidateSets[crypto.randomInt(0, candidateSets.length)];
      chosen.count++;

      newAssignmentDocs.push({
        examination: examId,
        student: student._id,
        registerNumber: student.registerNumber,
        questionSet: chosen.questionSet._id,
        setNumber: chosen.questionSet.setNumber,
        setName: chosen.questionSet.setName,
        isPublished: exam.isAssignmentPublished,
        assignedBy: facultyId,
        assignedAt: new Date()
      });
    }

    if (newAssignmentDocs.length > 0) {
      await Assignment.insertMany(newAssignmentDocs);
      exam.assignedCount = existingAssignments.length + newAssignmentDocs.length;
      await exam.save();

      // Log in history
      await AssignmentHistory.create({
        examination: examId,
        action: 'ASSIGN_UNASSIGNED',
        performedBy: facultyId,
        details: {
          previouslyAssigned: existingAssignments.length,
          newlyAssigned: newAssignmentDocs.length,
          totalNow: exam.assignedCount
        },
        note: `Assigned ${newAssignmentDocs.length} previously unassigned students while preserving existing allocations.`
      });
    }

    return {
      success: true,
      newlyAssignedCount: newAssignmentDocs.length,
      totalAssignedCount: existingAssignments.length + newAssignmentDocs.length
    };
  } finally {
    examLocks.delete(lockKey);
  }
}

/**
 * Resets assignments for an examination
 */
async function resetAssignments({ examId, facultyId, reason = 'Faculty requested reset' }) {
  const lockKey = examId.toString();
  if (examLocks.get(lockKey)) {
    throw new Error('An assignment operation is currently in progress. Please wait.');
  }
  examLocks.set(lockKey, true);

  try {
    const exam = await Examination.findById(examId);
    if (!exam) throw new Error('Examination not found.');

    const deleted = await Assignment.deleteMany({ examination: examId });
    exam.isAssignmentPublished = false;
    exam.assignedCount = 0;
    await exam.save();

    await AssignmentHistory.create({
      examination: examId,
      action: 'RESET',
      performedBy: facultyId,
      details: {
        deletedCount: deleted.deletedCount,
        reason
      },
      note: `Reset ${deleted.deletedCount} assignments. Reason: ${reason}`
    });

    return {
      success: true,
      deletedCount: deleted.deletedCount
    };
  } finally {
    examLocks.delete(lockKey);
  }
}

/**
 * Publishes assignments for an examination
 */
async function publishAssignments({ examId, facultyId }) {
  const exam = await Examination.findById(examId);
  if (!exam) throw new Error('Examination not found.');

  const count = await Assignment.countDocuments({ examination: examId });
  if (count === 0) {
    throw new Error('No assignments generated yet. Please generate assignments before publishing.');
  }

  await Assignment.updateMany({ examination: examId }, { isPublished: true });
  exam.isAssignmentPublished = true;
  await exam.save();

  await AssignmentHistory.create({
    examination: examId,
    action: 'PUBLISH',
    performedBy: facultyId,
    details: { totalAssigned: count },
    note: `Published assignments for ${count} students.`
  });

  return { success: true, publishedCount: count };
}

module.exports = {
  secureShuffle,
  computeBalancedDistribution,
  calculateDistributionStats,
  generateAssignments,
  assignUnassignedStudents,
  resetAssignments,
  publishAssignments
};
