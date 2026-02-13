const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 300
  },
  name: {
    type: String,
    maxlength: 300
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    default: 0.0
  },
  discountPrice: {
    type: Number
  },
  brandId: {
    type: Number
  },
  categoryId: {
    type: Number
  },
  sellerId: {
    type: Number
  },
  sku: {
    type: String,
    maxlength: 100
  },
  stock: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ratings: {
    type: Number
  },
  reviews: {
    type: Number
  }
}, {
  timestamps: true
});

productSchema.index({ id: 1 });

module.exports = mongoose.model('Product', productSchema);
