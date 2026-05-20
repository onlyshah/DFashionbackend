const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String },
  priority: { type: String },
  status: { type: String, default: 'open' },
  attachments: [{ type: String }],
  replies: [{ userId: Schema.Types.ObjectId, message: String, timestamp: Date }],
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
