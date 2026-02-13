const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },

  passwordHash: {
    type: String,
    required: true
  },

  firstName: String,
  lastName: String,

  fullName: {
    type: String,
    get() {
      return `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }
  },

  avatarUrl: String,
  bio: String,

  roleId: {
    type: String,
    required: true
  },

  role: String,
  departmentId: String,
  department: String,

  phone: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,

  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },

  emailVerificationToken: String,
  emailVerifiedAt: Date,

  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,

  loginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,

  resetPasswordToken: String,
  resetPasswordExpiry: Date,

  lastLogin: Date,
  lastActivity: Date,

  deletedAt: Date

}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

/* 🔐 Password Hash */
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

/* 🔐 Compare Password */
userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

/* 🚫 Hide password */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
