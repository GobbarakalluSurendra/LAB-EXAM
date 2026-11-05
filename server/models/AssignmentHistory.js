const mongoose = require('mongoose');

const assignmentHistorySchema = new mongoose.Schema({
  examination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Examination',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['GENERATE', 'RESET', 'PUBLISH', 'ASSIGN_UNASSIGNED'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  note: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AssignmentHistory', assignmentHistorySchema);
