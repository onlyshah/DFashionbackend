const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchSuggestionSchema = new Schema({
  text: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true
  },
  category: {
    type: String,
    enum: ['product', 'creator', 'post', 'hashtag', 'general'],
    default: 'general'
  },
  searchCount: {
    type: Number,
    default: 0
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSponsored: {
    type: Boolean,
    default: false
  },
  sponsoredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  relatedEntity: {
    type: Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  entityType: {
    type: String,
    enum: ['Product', 'User', 'Category'],
    default: null
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('SearchSuggestion', SearchSuggestionSchema);
