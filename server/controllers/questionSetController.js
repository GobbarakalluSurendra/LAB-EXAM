const mongoose = require('mongoose');
const QuestionSet = require('../models/QuestionSet');
const Examination = require('../models/Examination');
const Assignment = require('../models/Assignment');
const excelService = require('../services/excelService');

// GET /api/question-sets/exam/:examId
const getQuestionSetsByExam = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    const questionSets = await QuestionSet.find({ examination: examId })
      .sort({ setNumber: 1 });

    res.json({ success: true, questionSets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve question sets.', error: error.message });
  }
};

// GET /api/question-sets/:id
const getQuestionSetById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question set ID.' });
    }

    const questionSet = await QuestionSet.findById(id).populate('examination');
    if (!questionSet) {
      return res.status(404).json({ success: false, message: 'Question set not found.' });
    }
    res.json({ success: true, questionSet });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve question set.', error: error.message });
  }
};

// POST /api/question-sets
const createQuestionSet = async (req, res) => {
  try {
    const { examination, setName, setNumber, questions, totalMarks, isActive } = req.body;

    if (!examination || examination === 'undefined' || !mongoose.Types.ObjectId.isValid(examination)) {
      return res.status(400).json({ success: false, message: 'A valid Examination ID is required.' });
    }

    const exam = await Examination.findById(examination);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    // Determine next set number if not provided
    let num = setNumber;
    if (!num) {
      const highest = await QuestionSet.findOne({ examination }).sort({ setNumber: -1 });
      num = highest ? highest.setNumber + 1 : 1;
    }

    // Check duplicate setNumber
    const existing = await QuestionSet.findOne({ examination, setNumber: num });
    if (existing) {
      return res.status(400).json({ success: false, message: `Question Set Number ${num} already exists for this examination.` });
    }

    const name = setName ? setName.trim() : `SET ${num}`;

    // Normalize question numbers
    const formattedQuestions = (questions || []).map((q, idx) => ({
      questionNumber: q.questionNumber || idx + 1,
      title: q.title?.trim() || `Question ${idx + 1}`,
      description: q.description?.trim() || '',
      instructions: q.instructions?.trim() || '',
      marks: parseInt(q.marks, 10) || 0,
      attachments: q.attachments || []
    }));

    const computedMarks = totalMarks || formattedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;

    const questionSet = await QuestionSet.create({
      examination,
      subject: exam.subject,
      setNumber: num,
      setName: name,
      questions: formattedQuestions,
      totalMarks: computedMarks,
      isActive: isActive !== undefined ? isActive : true
    });

    // Update examination set count
    const totalSets = await QuestionSet.countDocuments({ examination, isActive: true });
    exam.numQuestionSets = totalSets;
    await exam.save();

    res.status(201).json({
      success: true,
      message: `Question Set ${name} created successfully.`,
      questionSet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create question set.', error: error.message });
  }
};

// PUT /api/question-sets/:id
const updateQuestionSet = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question set ID.' });
    }

    const { setName, setNumber, questions, totalMarks, isActive } = req.body;
    const questionSet = await QuestionSet.findById(id);

    if (!questionSet) {
      return res.status(404).json({ success: false, message: 'Question set not found.' });
    }

    if (setNumber && setNumber !== questionSet.setNumber) {
      const existing = await QuestionSet.findOne({
        examination: questionSet.examination,
        setNumber,
        _id: { $ne: questionSet._id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Set Number ${setNumber} already exists in this examination.` });
      }
      questionSet.setNumber = setNumber;
    }

    if (setName) questionSet.setName = setName.trim();
    if (isActive !== undefined) questionSet.isActive = isActive;

    if (questions) {
      questionSet.questions = questions.map((q, idx) => ({
        questionNumber: q.questionNumber || idx + 1,
        title: q.title?.trim() || `Question ${idx + 1}`,
        description: q.description?.trim() || '',
        instructions: q.instructions?.trim() || '',
        marks: parseInt(q.marks, 10) || 0,
        attachments: q.attachments || []
      }));
    }

    if (totalMarks !== undefined) {
      questionSet.totalMarks = totalMarks;
    } else if (questions) {
      questionSet.totalMarks = questionSet.questions.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
    }

    await questionSet.save();

    if (setName || setNumber) {
      await Assignment.updateMany(
        { questionSet: questionSet._id },
        { $set: { setName: questionSet.setName, setNumber: questionSet.setNumber } }
      );
    }

    res.json({
      success: true,
      message: 'Question set updated successfully.',
      questionSet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update question set.', error: error.message });
  }
};

// POST /api/question-sets/duplicate/:id
const duplicateQuestionSet = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question set ID.' });
    }

    const sourceSet = await QuestionSet.findById(id);
    if (!sourceSet) {
      return res.status(404).json({ success: false, message: 'Source question set not found.' });
    }

    const highest = await QuestionSet.findOne({ examination: sourceSet.examination }).sort({ setNumber: -1 });
    const nextNum = highest ? highest.setNumber + 1 : 1;

    const newSet = await QuestionSet.create({
      examination: sourceSet.examination,
      subject: sourceSet.subject,
      setNumber: nextNum,
      setName: `SET ${nextNum}`,
      questions: sourceSet.questions.map(q => ({
        questionNumber: q.questionNumber,
        title: q.title,
        description: q.description,
        instructions: q.instructions,
        marks: q.marks,
        attachments: [...(q.attachments || [])]
      })),
      totalMarks: sourceSet.totalMarks,
      isActive: true
    });

    await Examination.findByIdAndUpdate(sourceSet.examination, {
      $inc: { numQuestionSets: 1 }
    });

    res.status(201).json({
      success: true,
      message: `Duplicated successfully as Set ${nextNum}.`,
      questionSet: newSet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to duplicate question set.', error: error.message });
  }
};

// DELETE /api/question-sets/:id
const deleteQuestionSet = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question set ID.' });
    }

    const questionSet = await QuestionSet.findById(id);
    if (!questionSet) {
      return res.status(404).json({ success: false, message: 'Question set not found.' });
    }

    const assignedCount = await Assignment.countDocuments({ questionSet: questionSet._id });
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete question set because it is currently assigned to ${assignedCount} student(s). Please reset assignments first.`
      });
    }

    const examId = questionSet.examination;
    await QuestionSet.findByIdAndDelete(id);

    const remainingCount = await QuestionSet.countDocuments({ examination: examId, isActive: true });
    await Examination.findByIdAndUpdate(examId, { numQuestionSets: remainingCount });

    res.json({ success: true, message: 'Question set deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete question set.', error: error.message });
  }
};

// POST /api/question-sets/import/:examId
const importQuestionSets = async (req, res) => {
  try {
    const examId = req.params.examId;
    if (!examId || examId === 'undefined' || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing examination ID.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx).' });
    }

    const result = await excelService.importQuestionSetsFromExcel(req.file.buffer, examId);

    res.json({
      success: true,
      message: `Imported ${result.totalSetsImported} question set(s) successfully!`,
      result
    });
  } catch (error) {
    console.error('[Import Question Sets Error]:', error.message || error);
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to import question sets.',
      error: error.message,
      errors: error.errors || []
    });
  }
};

// GET /api/question-sets/template
const downloadTemplate = async (req, res) => {
  try {
    const workbook = await excelService.generateQuestionSetTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="smartlab_question_sets_template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to download template.', error: error.message });
  }
};

// POST /api/question-sets/copy-from-exam
const copySetsFromExam = async (req, res) => {
  try {
    const { fromExamId, toExamId } = req.body;
    if (!fromExamId || !toExamId) {
      return res.status(400).json({ success: false, message: 'Both source and target examination IDs are required.' });
    }
    if (fromExamId === toExamId) {
      return res.status(400).json({ success: false, message: 'Source and target cannot be the same examination.' });
    }

    const sourceSets = await QuestionSet.find({ examination: fromExamId, isActive: true }).sort({ setNumber: 1 });
    if (!sourceSets || sourceSets.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected examination has no question sets to copy.' });
    }

    const targetExam = await Examination.findById(toExamId);
    if (!targetExam) {
      return res.status(404).json({ success: false, message: 'Target examination not found.' });
    }

    let createdCount = 0;
    for (const set of sourceSets) {
      const existing = await QuestionSet.findOne({ examination: toExamId, setNumber: set.setNumber });
      if (existing) {
        existing.setName = set.setName;
        existing.questions = set.questions;
        existing.totalMarks = set.totalMarks;
        await existing.save();
      } else {
        await QuestionSet.create({
          examination: toExamId,
          subject: targetExam.subject,
          setNumber: set.setNumber,
          setName: set.setName,
          questions: set.questions,
          totalMarks: set.totalMarks,
          isActive: true
        });
        createdCount++;
      }
    }

    const totalSets = await QuestionSet.countDocuments({ examination: toExamId, isActive: true });
    targetExam.numQuestionSets = totalSets;
    await targetExam.save();

    res.json({
      success: true,
      message: `Successfully copied ${sourceSets.length} question sets to ${targetExam.title}!`,
      totalSets
    });
  } catch (error) {
    console.error('[Copy Sets Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to copy question sets.', error: error.message });
  }
};

module.exports = {
  getQuestionSetsByExam,
  getQuestionSetById,
  createQuestionSet,
  updateQuestionSet,
  duplicateQuestionSet,
  deleteQuestionSet,
  importQuestionSets,
  downloadTemplate,
  copySetsFromExam
};
