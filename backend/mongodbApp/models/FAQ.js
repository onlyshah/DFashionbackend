const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FAQSchema = new Schema({
  question: {
    type: String,
    required: true,
    maxlength: 500
  },
  answer: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['general', 'shipping', 'returns', 'payment', 'account', 'products', 'sellers', 'technical'],
    default: 'general'
  },
  order: {
    type: Number,
    default: 0
  },
  helpfulYes: {
    type: Number,
    default: 0
  },
  helpfulNo: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  relatedFAQs: [{
    type: Schema.Types.ObjectId,
    ref: 'FAQ'
  }],
  relatedProduct: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  relatedPage: {
    type: Schema.Types.ObjectId,
    ref: 'Page',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('FAQ', FAQSchema);
