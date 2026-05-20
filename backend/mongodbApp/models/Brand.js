const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BrandSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  slug: { type: String, unique: true, index: true },
  description: { type: String },
  logoUrl: { type: String },
  bannerUrl: { type: String },
  website: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Brand', BrandSchema);
