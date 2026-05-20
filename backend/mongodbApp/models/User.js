const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include in queries by default
    },
    fullName: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      default: '/uploads/avatars/default-avatar.svg'
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'vendor', 'end_user'],
      default: 'end_user'
    },
    department: {
      type: String,
      enum: [
        'administration',
        'vendor_management',
        'customer_service',
        'content_moderation',
        'finance',
        'operations',
        'marketing'
      ],
      default: 'customer_service'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isInfluencer: {
      type: Boolean,
      default: false
    },
    bio: {
      type: String,
      maxlength: 500
    },
    phoneNumber: {
      type: String,
      sparse: true
    },
    socialStats: {
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      postsCount: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 }
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false }
    },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, collection: 'users' }
);

// Index for frequently searched fields
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isInfluencer: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

// Virtual for display name
userSchema.virtual('displayName').get(function () {
  return this.fullName || this.username;
});

// Exclude sensitive fields when converting to JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
