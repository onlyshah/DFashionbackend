const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    firstName: {
      type: String,
      required: [true, 'First name is required']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required']
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required']
    },
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    buildingName: String,
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required']
    },
    country: {
      type: String,
      default: 'India'
    },
    landmark: String,
    type: {
      type: String,
      enum: ['home', 'work', 'other', 'both'],
      default: 'home'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    instructions: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, collection: 'addresses' }
);

// Index for user lookup
addressSchema.index({ user: 1 });
addressSchema.index({ isDefault: 1 });

module.exports = mongoose.model('Address', addressSchema);
