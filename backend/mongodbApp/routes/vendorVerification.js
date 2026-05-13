const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { auth, requireRole } = require('../middleware/auth');

// Verification routes (consolidated from vendorVerificationController → vendorController)
router.get('/pending', auth, requireRole('super_admin'), vendorController.getPendingVerifications);
router.get('/:vendorId/status', auth, requireRole('super_admin'), vendorController.getVerificationStatus);
router.post('/:vendorId/submit-documents', auth, vendorController.submitVerificationDocuments);
router.post('/:vendorId/approve', auth, requireRole('super_admin'), vendorController.approveVendor);
router.post('/:vendorId/reject', auth, requireRole('super_admin'), vendorController.rejectVendor);
router.post('/:vendorId/suspend', auth, requireRole('super_admin'), vendorController.suspendVendor);

module.exports = router;