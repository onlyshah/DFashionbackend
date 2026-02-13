const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  userId: {
    type: Number,
    required: false
  },
  action: {
    type: String,
    required: true,
    maxlength: 100
  },
  module: {
    type: String,
    maxlength: 100
  },
  description: {
    type: String
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    maxlength: 50
  }
}, {
  timestamps: true
});

auditLogSchema.index({ id: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
