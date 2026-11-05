const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  registerNumber: {
    type: String,
    required: [true, 'Register number is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  firstName: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: 'Computer Science and Engineering',
    index: true
  },
  year: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
    index: true
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'A',
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

studentSchema.index({ department: 1, year: 1, section: 1 });

module.exports = mongoose.model('Student', studentSchema);
