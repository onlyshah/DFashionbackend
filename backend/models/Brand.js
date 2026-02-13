const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 200
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

BrandSchema.index({ id: 1 });

module.exports = mongoose.model('Brand', BrandSchema);
