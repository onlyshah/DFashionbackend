const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  category: String,
  question: String,
  answer: String,
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 },
  status: { type: String, enum: ['draft','published'], default: 'published' },
  position: Number
});

module.exports = mongoose.model('FAQ', faqSchema);
