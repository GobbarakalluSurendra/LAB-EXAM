const mongoose = require('mongoose');

const studentActivitySchema = new mongoose.Schema({
  examination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Examination',
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  registerNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  questionSet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSet'
  },
  setName: {
    type: String
  },
  firstLoginAt: {
    type: Date,
    default: Date.now
  },
  lastAccessAt: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 1
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
});

studentActivitySchema.index({ examination: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('StudentActivity', studentActivitySchema);
