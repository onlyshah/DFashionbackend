const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  image: {
    type: String,
    maxlength: 500
  },
  imageUrl: {
    type: String,
    maxlength: 500
  },
  link: {
    type: String,
    maxlength: 500
  },
  position: {
    type: String,
    enum: ['header', 'footer', 'sidebar', 'modal'],
    default: 'header'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

bannerSchema.index({ id: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
