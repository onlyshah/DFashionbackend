const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PageSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft','published'], default: 'draft' },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Page', PageSchema);
