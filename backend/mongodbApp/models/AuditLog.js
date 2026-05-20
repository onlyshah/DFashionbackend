const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String },
  resource: { type: String },
  resourceId: { type: Schema.Types.ObjectId },
  changes: { type: Object },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String },
  errorMessage: { type: String }
}, { timestamps: true });

AuditLogSchema.index({ userId: 1, action: 1, resource: 1, createdAt: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
