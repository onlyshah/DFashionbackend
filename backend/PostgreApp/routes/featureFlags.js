const express = require('express');
const router = express.Router();
const featureFlagController = require('../controllers/featureFlagController');
const { auth, requireRole } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// Public endpoint - check feature status
router.get('/status/:flag_name', auth, featureFlagController.getFeatureStatus);

// Super admin endpoints for feature flag management
const requireSuperAdmin = [verifyAdminToken, requireRole(['super_admin'])];

// List all feature flags
router.get('/', requireSuperAdmin, featureFlagController.listFeatures);

// Create feature flag
router.post('/', requireSuperAdmin, featureFlagController.createFeatureFlag);

// Get specific flag details
router.get('/:flag_id', requireSuperAdmin, featureFlagController.listFeatures);

// Update feature flag
router.put('/:flag_id', requireSuperAdmin, featureFlagController.updateFlag);

// Toggle feature (activate/deactivate)
router.post('/:flag_id/toggle', requireSuperAdmin, featureFlagController.toggleFeature);

// Delete feature flag (archives it)
router.delete('/:flag_id', requireSuperAdmin, featureFlagController.deleteFlag);

// Test feature flag with specific user
router.post('/:flag_id/test', requireSuperAdmin, featureFlagController.testFeature);

// Get feature flag analytics
router.get('/:flag_id/analytics', requireSuperAdmin, featureFlagController.getFlagAnalytics);

module.exports = router;