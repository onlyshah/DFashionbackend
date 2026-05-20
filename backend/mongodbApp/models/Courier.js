const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourierSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  email: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    required: true
  },
  website: {
    type: String,
    default: null
  },
  logo: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: 1000
  },
  serviceTypes: [{
    type: String,
    enum: ['standard', 'express', 'overnight', 'same_day', 'scheduled', 'bulk']
  }],
  coverageRegions: [{
    type: String
  }],
  baseRate: {
    type: Number,
    default: 0
  },
  ratePerKg: {
    type: Number,
    default: 0
  },
  ratePerKm: {
    type: Number,
    default: 0
  },
  estimatedDeliveryDays: {
    type: Number,
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  apiKey: {
    type: String,
    default: null,
    select: false
  },
  apiEndpoint: {
    type: String,
    default: null
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Courier', CourierSchema);
