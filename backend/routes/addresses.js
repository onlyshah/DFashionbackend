/**
 * 📍 Address Routes
 * Endpoints for managing user addresses
 */

const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/addressController');
const { protect } = require('../../middleware/auth');

// Middleware: All routes require authentication
router.use(protect);

// @route   POST /api/addresses
// @desc    Create a new address
// @access  Private
router.post('/', addressController.createAddress);

// @route   GET /api/addresses
// @desc    Get all addresses for current user
// @access  Private
router.get('/', addressController.getAddresses);

// @route   GET /api/addresses/:id
// @desc    Get specific address by ID
// @access  Private
router.get('/:id', addressController.getAddressById);

// @route   PUT /api/addresses/:id
// @desc    Update address
// @access  Private
router.put('/:id', addressController.updateAddress);

// @route   DELETE /api/addresses/:id
// @desc    Delete (soft delete) address
// @access  Private
router.delete('/:id', addressController.deleteAddress);

// @route   PUT /api/addresses/:id/set-default
// @desc    Set address as default for shipping/billing
// @access  Private
router.put('/:id/set-default', addressController.setDefaultAddress);

module.exports = router;
