const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RewardSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['post_like', 'daily_login', 'purchase', 'referral', 'review', 'share', 'follow'],
    required: true
  },
  credits: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String
  },
  relatedEntity: {
    type: Schema.Types.ObjectId,
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['Post', 'Product', 'Order', 'User', 'Reel']
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  processedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Reward', RewardSchema);
