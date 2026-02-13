const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    maxlength: 100
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

faqSchema.index({ id: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
