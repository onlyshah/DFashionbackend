const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

roleSchema.index({ id: 1 });

module.exports = mongoose.model('Role', roleSchema);
