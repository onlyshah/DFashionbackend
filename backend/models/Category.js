const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 200
  },
  slug: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

categorySchema.index({ id: 1 });

module.exports = mongoose.model('Category', categorySchema);
