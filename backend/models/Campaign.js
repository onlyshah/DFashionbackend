const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['promotional', 'seasonal', 'flash_sale', 'clearance', 'loyalty', 'seasonal_sale'],
    default: 'promotional'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  banner: {
    type: String,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

campaignSchema.index({ id: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
