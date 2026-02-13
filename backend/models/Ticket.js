const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  ticketNumber: {
    type: String,
    unique: true,
    maxlength: 50
  },
  userId: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 300
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    maxlength: 100
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: Number
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

ticketSchema.index({ id: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
