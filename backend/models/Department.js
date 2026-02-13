const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
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
  displayName: {
    type: String,
    maxlength: 200
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

departmentSchema.index({ id: 1 });

module.exports = mongoose.model('Department', departmentSchema);
