const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  examination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Examination',
    required: [true, 'Examination reference is required'],
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required'],
    index: true
  },
  registerNumber: {
    type: String,
    required: [true, 'Register number is required'],
    uppercase: true,
    trim: true,
    index: true
  },
  questionSet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSet',
    required: [true, 'Question set reference is required'],
    index: true
  },
  setNumber: {
    type: Number,
    required: true
  },
  setName: {
    type: String,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  }
});

// Ensure strictly one assignment per student per examination
assignmentSchema.index({ examination: 1, student: 1 }, { unique: true });
assignmentSchema.index({ examination: 1, questionSet: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
