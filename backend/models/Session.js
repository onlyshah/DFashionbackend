const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  userId: {
    type: Number,
    required: true
  },
  token: {
    type: String
  },
  ipAddress: {
    type: String,
    maxlength: 50
  },
  userAgent: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

sessionSchema.index({ id: 1 });

module.exports = mongoose.model('Session', sessionSchema);
