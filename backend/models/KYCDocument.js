const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String, enum: ['aadhaar','pan','gst','shopAct','businessLicense'], required: true },
  documentUrl: String,
  documentNumber: String,
  expiryDate: Date,
  status: { type: String, enum: ['pending','verified','rejected'], default: 'pending' },
  rejectionReason: String,
  uploadedAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('KYCDocument', kycDocumentSchema);
