/**
 * 📍 Address Routes
 * Endpoints for managing user addresses
 */

const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { auth, verifyOwnership } = require('../middleware/auth');

// All address operations require authentication
router.post('/', auth, addressController.createAddress);
router.get('/', auth, addressController.getAddresses);
router.get('/:id', auth, verifyOwnership('Address', 'id', 'user'), addressController.getAddressById);
router.put('/:id', auth, verifyOwnership('Address', 'id', 'user'), addressController.updateAddress);
router.delete('/:id', auth, verifyOwnership('Address', 'id', 'user'), addressController.deleteAddress);
router.put('/:id/set-default', auth, verifyOwnership('Address', 'id', 'user'), addressController.setDefaultAddress);

module.exports = router;
