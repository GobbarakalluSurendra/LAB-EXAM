const mongoose = require('mongoose');

const singleQuestionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Question description is required'],
    trim: true
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  },
  marks: {
    type: Number,
    default: 0
  },
  attachments: [{
    type: String
  }]
});

const questionSetSchema = new mongoose.Schema({
  examination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Examination',
    required: [true, 'Examination reference is required'],
    index: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  setNumber: {
    type: Number,
    required: [true, 'Set number is required']
  },
  setName: {
    type: String,
    required: [true, 'Set name is required'],
    trim: true
  },
  questions: [singleQuestionSchema],
  totalMarks: {
    type: Number,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure setNumber is unique per examination
questionSetSchema.index({ examination: 1, setNumber: 1 }, { unique: true });

module.exports = mongoose.model('QuestionSet', questionSetSchema);
