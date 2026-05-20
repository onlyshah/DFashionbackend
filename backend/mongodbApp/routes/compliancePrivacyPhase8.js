/**
 * Compliance & Privacy Routes - Phase 8
 * Routes: /api/v1/compliance
 */

const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/compliancePrivacyControllerPhase8');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get privacy policy
router.get('/privacy-policy', complianceController.getPrivacyPolicy);

// GET - Get terms of service
router.get('/terms-of-service', complianceController.getTermsOfService);

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// POST - Accept terms
router.post('/accept-terms', complianceController.acceptTerms);

// POST - Request data export
router.post('/data-export/request', complianceController.requestDataExport);

// POST - Delete account
router.post('/account/delete', complianceController.deleteAccount);

// PATCH - Manage consent
router.patch('/consent', complianceController.manageConsent);

/**
 * Protected Routes (Admin)
 */

// GET - Get compliance status
router.get('/status', verifyRole(['admin', 'super_admin']), complianceController.getComplianceStatus);

module.exports = router;
