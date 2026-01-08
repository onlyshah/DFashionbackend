const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: String,
  content: String,
  metaTitle: String,
  metaDescription: String,
  keywords: [String],
  status: { type: String, enum: ['draft','published'], default: 'draft' },
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: Date,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Page', pageSchema);
