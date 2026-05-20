const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FlashSaleSchema = new Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    index: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  banner: {
    type: String,
    default: null
  },
  thumbnail: {
    type: String,
    default: null
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  products: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    originalPrice: Number,
    salePrice: Number,
    discount: Number,
    quantity: Number,
    soldQuantity: { type: Number, default: 0 }
  }],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  budget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  conversions: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('FlashSale', FlashSaleSchema);
