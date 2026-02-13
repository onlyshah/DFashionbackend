const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: true,
    maxlength: 150
  },
  phone: {
    type: String,
    required: true,
    maxlength: 20
  },
  address: {
    type: String
  },
  city: {
    type: String,
    maxlength: 100
  },
  state: {
    type: String,
    maxlength: 100
  },
  zipCode: {
    type: String,
    maxlength: 20
  },
  country: {
    type: String,
    maxlength: 100
  },
  contactPerson: {
    type: String,
    maxlength: 150
  },
  website: {
    type: String,
    maxlength: 255
  },
  companyRegistration: {
    type: String,
    maxlength: 100
  },
  taxId: {
    type: String,
    maxlength: 50
  },
  paymentTerms: {
    type: String,
    maxlength: 255
  },
  minimumOrderQuantity: {
    type: Number,
    default: 1
  },
  leadTime: {
    type: Number
  }
}, {
  timestamps: true
});

supplierSchema.index({ id: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
