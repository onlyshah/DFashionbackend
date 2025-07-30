const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['core', 'ecommerce', 'content', 'analytics', 'management', 'system'],
    default: 'core'
  },
  icon: {
    type: String,
    default: 'fas fa-cog'
  },
  route: {
    type: String,
    required: true,
    trim: true
  },
  availableActions: [{
    name: {
      type: String,
      required: true,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export', 'import', 'manage']
    },
    displayName: {
      type: String,
      required: true
    },
    description: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  requiredLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better performance
moduleSchema.index({ name: 1 });
moduleSchema.index({ category: 1 });
moduleSchema.index({ isActive: 1 });

module.exports = mongoose.model('Module', moduleSchema);
