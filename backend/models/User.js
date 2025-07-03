const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  bio: {
    type: String,
    maxlength: 150
  },
  role: {
    type: String,
    enum: ['customer', 'vendor', 'super_admin'],
    default: 'customer'
  },
  permissions: [{
    module: {
      type: String,
      enum: ['users', 'products', 'orders', 'analytics', 'content', 'settings', 'reports', 'dashboard']
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export']
    }]
  }],
  department: {
    type: String,
    enum: ['admin', 'sales', 'marketing', 'accounting', 'support', 'management'],
    default: 'admin'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isInfluencer: {
    type: Boolean,
    default: false
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    inApp: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    categories: {
      order: {
        type: Boolean,
        default: true
      },
      payment: {
        type: Boolean,
        default: true
      },
      social: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      },
      system: {
        type: Boolean,
        default: true
      },
      security: {
        type: Boolean,
        default: true
      }
    }
  },
  pushTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  preferences: {
    categories: [String],
    brands: [String],
    priceRange: {
      min: Number,
      max: Number
    }
  },
  vendorInfo: {
    businessName: String,
    businessType: String,
    taxId: String,
    bankDetails: {
      accountNumber: String,
      routingNumber: String,
      bankName: String
    },
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  socialStats: {
    postsCount: {
      type: Number,
      default: 0
    },
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    }
  },
  cart: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    size: String,
    color: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  wishlist: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
