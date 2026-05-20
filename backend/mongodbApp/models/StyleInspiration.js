const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StyleInspirationSchema = new Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: { type: String, required: true },
    alt: String,
    order: Number
  }],
  thumbnail: {
    type: String,
    default: '/uploads/style-inspiration/default.jpg'
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  category: {
    type: String,
    enum: ['casual', 'formal', 'party', 'ethnic', 'sports', 'accessories', 'other'],
    default: 'casual'
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'all-season'],
    default: 'all-season'
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('StyleInspiration', StyleInspirationSchema);
