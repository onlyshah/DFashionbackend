const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  budget: {
    type: Number,
    default: 0,
  },
  spent: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Campaign', campaignSchema);
