const mongoose = require('mongoose');

const courierSchema = new mongoose.Schema({
  name: String,
  apiKey: String,
  apiSecret: String,
  apiEndpoint: String,
  isActive: { type: Boolean, default: true },
  supportedServices: [String],
  pickupAvailable: { type: Boolean, default: true },
  codSupported: { type: Boolean, default: true },
  integrationDate: Date,
  lastSyncDate: Date
});

module.exports = mongoose.model('Courier', courierSchema);
