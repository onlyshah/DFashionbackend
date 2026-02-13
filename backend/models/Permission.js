const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
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
    required: true,
    maxlength: 150
  },
  description: {
    type: String
  },
  module: {
    type: String,
    required: true,
    maxlength: 100
  },
  actions: {
    type: Array,
    default: []
  },
  isSystemPermission: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Number
  }
}, {
  timestamps: true
});

permissionSchema.index({ id: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
