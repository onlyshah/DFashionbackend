const mongoose = require('mongoose');

const sellerPerformanceSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  overallRating: { type: Number, min:1, max:5, default:4.5 },
  orderFulfillmentRate: { type: Number, default: 95 },
  returnRate: { type: Number, default: 2 },
  customerServiceRating: { type: Number, min:1, max:5, default:4 },
  onTimeDeliveryRate: { type: Number, default: 97 },
  cancellationRate: { type: Number, default: 1 },
  monthlyMetrics: [{ month: Date, ordersPlaced: Number, ordersCompleted: Number, ordersCancelled: Number, returnRate: Number }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SellerPerformance', sellerPerformanceSchema);
