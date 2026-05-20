const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RolePermissionSchema = new Schema({
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  permission: {
    type: Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  },
  actions: [{
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'publish']
  }],
  isGranted: {
    type: Boolean,
    default: true
  },
  grantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  grantedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create compound index for role-permission uniqueness
RolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', RolePermissionSchema);
