const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrendingSearchSchema = new Schema({
  keyword: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true
  },
  searchCount: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['product', 'creator', 'post', 'hashtag', 'general'],
    default: 'general'
  },
  timeRange: {
    type: String,
    enum: ['1h', '24h', '7d', '30d', 'all'],
    default: '24h'
  },
  region: {
    type: String,
    default: 'global'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  relatedKeywords: [{
    type: String
  }],
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('TrendingSearch', TrendingSearchSchema);
