const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductShareSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  sharedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  platform: {
    type: String,
    enum: ['facebook', 'twitter', 'instagram', 'whatsapp', 'email', 'link', 'internal'],
    default: 'internal'
  },
  shareMessage: {
    type: String,
    maxlength: 500
  },
  shareLink: {
    type: String,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  conversions: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('ProductShare', ProductShareSchema);
