const mongoose = require('mongoose');

const sellerCommissionSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  commissionPercentage: { type: Number, required: true, default: 15 },
  categoryCommission: [{ category: String, percentage: Number }],
  minimumPayout: { type: Number, default: 1000 },
  payoutFrequency: { type: String, enum: ['weekly','bi-weekly','monthly'], default: 'monthly' },
  bankDetails: { accountName: String, accountNumber: String, ifscCode: String, verified: { type: Boolean, default: false } },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

module.exports = mongoose.model('SellerCommission', sellerCommissionSchema);
