const express = require('express');
const router = express.Router();
const dataGovernanceController = require('../controllers/dataGovernanceController');
const { auth, requireRole } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// User can export their own data
router.get('/export/:user_id', auth, dataGovernanceController.gdprDataExport);

// Super admin endpoints for data governance
const requireSuperAdmin = [verifyAdminToken, requireRole(['super_admin'])];

// Delete user data (GDPR right to be forgotten)
router.post('/delete-user/:user_id', requireSuperAdmin, dataGovernanceController.resetUserData);

// Get data retention policy
router.get('/retention-policy', requireSuperAdmin, dataGovernanceController.dataRetentionPolicy);

// Update data retention policy
router.put('/retention-policy', requireSuperAdmin, dataGovernanceController.dataRetentionPolicy);

// Get privacy settings
router.get('/privacy-settings', requireSuperAdmin, dataGovernanceController.privacySettings);

// Update privacy settings
router.put('/privacy-settings', requireSuperAdmin, dataGovernanceController.privacySettings);

// Get consent tracking records
router.get('/consent-tracking', requireSuperAdmin, dataGovernanceController.consentTracking);

// Record user consent
router.post('/consent-tracking/:user_id', auth, dataGovernanceController.consentTracking);

// Get data audit report
router.get('/audit', requireSuperAdmin, dataGovernanceController.dataAudit);

module.exports = router;