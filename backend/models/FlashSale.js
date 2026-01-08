const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  discountPercent: Number,
  products: [{ productId: mongoose.Schema.Types.ObjectId, salePrice: Number, stockLimit: Number, claimed: Number }],
  status: { type: String, enum: ['scheduled','live','ended'], default: 'scheduled' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FlashSale', flashSaleSchema);
