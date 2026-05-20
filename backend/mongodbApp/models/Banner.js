const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BannerSchema = new Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  link: { type: String },
  position: { type: String },
  displayOrder: { type: Number },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

BannerSchema.index({ position: 1, isActive: 1 });

module.exports = mongoose.model('Banner', BannerSchema);
