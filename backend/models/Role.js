const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['super_admin', 'admin', 'sales_manager', 'sales_executive', 'marketing_manager', 'marketing_executive', 'account_manager', 'accountant', 'support_manager', 'support_agent', 'content_manager', 'vendor_manager']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['administration', 'sales', 'marketing', 'accounting', 'support', 'content', 'vendor_management']
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  permissions: {
    // Dashboard Access
    dashboard: {
      view: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      reports: { type: Boolean, default: false }
    },
    
    // User Management
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      ban: { type: Boolean, default: false },
      roles: { type: Boolean, default: false }
    },
    
    // Product Management
    products: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      featured: { type: Boolean, default: false },
      inventory: { type: Boolean, default: false }
    },
    
    // Order Management
    orders: {
      view: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      cancel: { type: Boolean, default: false },
      refund: { type: Boolean, default: false },
      shipping: { type: Boolean, default: false },
      reports: { type: Boolean, default: false }
    },
    
    // Financial Management
    finance: {
      view: { type: Boolean, default: false },
      transactions: { type: Boolean, default: false },
      payouts: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      taxes: { type: Boolean, default: false },
      reconciliation: { type: Boolean, default: false }
    },
    
    // Marketing & Content
    marketing: {
      campaigns: { type: Boolean, default: false },
      promotions: { type: Boolean, default: false },
      content: { type: Boolean, default: false },
      social: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      email: { type: Boolean, default: false }
    },
    
    // Support & Communication
    support: {
      tickets: { type: Boolean, default: false },
      chat: { type: Boolean, default: false },
      knowledge_base: { type: Boolean, default: false },
      announcements: { type: Boolean, default: false }
    },
    
    // Vendor Management
    vendors: {
      view: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      commission: { type: Boolean, default: false },
      performance: { type: Boolean, default: false },
      payouts: { type: Boolean, default: false }
    },
    
    // System Settings
    settings: {
      general: { type: Boolean, default: false },
      security: { type: Boolean, default: false },
      integrations: { type: Boolean, default: false },
      backup: { type: Boolean, default: false },
      logs: { type: Boolean, default: false }
    }
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

// Method to check if role has specific permission
roleSchema.methods.hasPermission = function(module, action) {
  return this.permissions[module] && this.permissions[module][action];
};

// Method to get all permissions for a role
roleSchema.methods.getAllPermissions = function() {
  const permissions = [];
  for (const module in this.permissions) {
    for (const action in this.permissions[module]) {
      if (this.permissions[module][action]) {
        permissions.push(`${module}.${action}`);
      }
    }
  }
  return permissions;
};

module.exports = mongoose.model('Role', roleSchema);
