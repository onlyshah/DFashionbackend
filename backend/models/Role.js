const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
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
  department: {
    type: String,
    required: true,
    enum: ['administration', 'sales', 'marketing', 'accounting', 'support', 'content', 'vendor_management', 'customer_service']
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  modulePermissions: [{
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export', 'import', 'manage']
    }],
    isGranted: {
      type: Boolean,
      default: true
    }
  }],
  isSystemRole: {
    type: Boolean,
    default: false // true for super_admin, admin, vendor, end_user
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better performance
roleSchema.index({ name: 1 });
roleSchema.index({ department: 1 });
roleSchema.index({ level: 1 });
roleSchema.index({ isActive: 1 });

// Method to check if role has specific permission for a module
roleSchema.methods.hasModulePermission = function(moduleId, action) {
  const modulePermission = this.modulePermissions.find(
    mp => mp.module.toString() === moduleId.toString() && mp.isGranted
  );
  return modulePermission && modulePermission.actions.includes(action);
};

// Method to get all permissions for a role
roleSchema.methods.getAllPermissions = function() {
  const permissions = [];
  this.modulePermissions.forEach(mp => {
    if (mp.isGranted) {
      mp.actions.forEach(action => {
        permissions.push({
          module: mp.module,
          action: action
        });
      });
    }
  });
  return permissions;
};

// Method to add module permission
roleSchema.methods.addModulePermission = function(moduleId, actions) {
  const existingPermission = this.modulePermissions.find(
    mp => mp.module.toString() === moduleId.toString()
  );
  
  if (existingPermission) {
    // Update existing permission
    existingPermission.actions = [...new Set([...existingPermission.actions, ...actions])];
    existingPermission.isGranted = true;
  } else {
    // Add new permission
    this.modulePermissions.push({
      module: moduleId,
      actions: actions,
      isGranted: true
    });
  }
};

// Method to remove module permission
roleSchema.methods.removeModulePermission = function(moduleId, actions = null) {
  const permissionIndex = this.modulePermissions.findIndex(
    mp => mp.module.toString() === moduleId.toString()
  );
  
  if (permissionIndex !== -1) {
    if (actions) {
      // Remove specific actions
      this.modulePermissions[permissionIndex].actions = 
        this.modulePermissions[permissionIndex].actions.filter(
          action => !actions.includes(action)
        );
      
      // If no actions left, remove the entire permission
      if (this.modulePermissions[permissionIndex].actions.length === 0) {
        this.modulePermissions.splice(permissionIndex, 1);
      }
    } else {
      // Remove entire module permission
      this.modulePermissions.splice(permissionIndex, 1);
    }
  }
};

module.exports = mongoose.model('Role', roleSchema);
