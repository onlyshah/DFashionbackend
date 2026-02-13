const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String
  },
  type: {
    type: String,
    maxlength: 50
  },
  discountValue: {
    type: Number
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  appliesTo: {
    type: Array,
    default: []
  },
  validFrom: {
    type: Date
  },
  validUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

promotionSchema.index({ id: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
