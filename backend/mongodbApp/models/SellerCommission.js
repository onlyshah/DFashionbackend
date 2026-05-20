const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SellerCommissionSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  orderItemId: { type: Schema.Types.ObjectId, ref: 'OrderItem' },
  orderAmount: { type: Number, required: true },
  commissionRate: { type: Number },
  commissionAmount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  paymentDate: { type: Date },
  period: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SellerCommission', SellerCommissionSchema);
