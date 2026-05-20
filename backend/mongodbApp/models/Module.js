const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ModuleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  icon: {
    type: String,
    default: 'module'
  },
  category: {
    type: String,
    enum: ['core', 'commerce', 'social', 'admin', 'vendor', 'user', 'system'],
    default: 'core'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  routes: [{
    path: String,
    method: String
  }],
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  version: {
    type: String,
    default: '1.0.0'
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Module', ModuleSchema);
