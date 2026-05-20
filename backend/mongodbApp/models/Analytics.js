const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnalyticsSchema = new Schema({
  date: { type: Date, required: true, index: true },
  metric: { type: String, required: true, index: true },
  category: { type: String },
  value: { type: Number },
  metadata: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
