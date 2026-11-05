const mongoose = require('mongoose');

const examinationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Examination title is required'],
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject reference is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Year is required']
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
    uppercase: true
  },
  examDate: {
    type: Date,
    required: [true, 'Examination date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    trim: true
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    trim: true
  },
  numQuestionSets: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Active', 'Completed'],
    default: 'Draft',
    index: true
  },
  isAssignmentPublished: {
    type: Boolean,
    default: false
  },
  instructions: {
    type: String,
    default: '1. All questions are compulsory unless specified.\n2. Do your coding only on your assigned physical machine.\n3. Do not attempt to refresh or exchange question sets.'
  },
  collegeName: {
    type: String,
    default: 'National Institute of Technology & Engineering'
  },
  labName: {
    type: String,
    default: 'Computer Systems & Software Engineering Laboratory'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

examinationSchema.index({ department: 1, year: 1, section: 1, status: 1 });

module.exports = mongoose.model('Examination', examinationSchema);
