const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KYCDocumentSchema = new Schema({
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  documentType: {
    type: String,
    enum: ['aadhar', 'pan', 'gst_certificate', 'business_license', 'bank_account', 'other'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true
  },
  documentFile: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('KYCDocument', KYCDocumentSchema);
