const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PromotionSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  promotionType: { type: String, enum: ['flash_sale','seasonal','category','brand'] },
  discountType: { type: String, enum: ['percentage','fixed'], required: true },
  discountValue: { type: Number, required: true },
  applicableOn: { type: String, enum: ['all_products','specific_category','specific_product'], default: 'all_products' },
  productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', PromotionSchema);
