const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: String,
  imageUrl: String,
  imageAlt: String,
  redirectUrl: String,
  type: { type: String, enum: ['hero','promo','category_highlight'], default: 'promo' },
  position: Number,
  active: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  displayOn: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banner', bannerSchema);
