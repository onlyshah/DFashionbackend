const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SellerPerformanceSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  activeProducts: { type: Number, default: 0 },
  returnRate: { type: Number, default: 0 },
  cancellationRate: { type: Number, default: 0 },
  lastUpdatedAt: { type: Date, default: Date.now },
  month: { type: String }
});

SellerPerformanceSchema.index({ vendorId: 1, month: 1 });

module.exports = mongoose.model('SellerPerformance', SellerPerformanceSchema);
