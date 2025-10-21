const mongoose = require('mongoose');

const QuickActionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  icon: { type: String },
  link: { type: String, required: true },
  color: { type: String },
  roles: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('QuickAction', QuickActionSchema);
