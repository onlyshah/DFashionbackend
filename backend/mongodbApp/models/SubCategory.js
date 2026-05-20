const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  description: { type: String },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
  imageUrl: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SubCategory', SubCategorySchema);
