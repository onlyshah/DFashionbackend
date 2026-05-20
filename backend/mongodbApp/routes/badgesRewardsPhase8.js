/**
 * Badges & Rewards Routes - Phase 8
 * Routes: /api/v1/badges-rewards
 */

const express = require('express');
const router = express.Router();
const badgesController = require('../controllers/badgesRewardsControllerPhase8');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get all badges
router.get('/badges', badgesController.getAllBadges);

// GET - Get badge details
router.get('/badges/:badgeId', badgesController.getBadgeDetails);

// GET - Get reward catalog
router.get('/rewards/catalog', badgesController.getRewardCatalog);

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// GET - Get user badges
router.get('/badges/user/:userId', badgesController.getUserBadges);

// GET - Get user rewards
router.get('/rewards', badgesController.getUserRewards);

// POST - Redeem reward
router.post('/rewards/redeem', badgesController.redeemReward);

// GET - Check badge eligibility
router.get('/badges/eligibility', badgesController.checkBadgeEligibility);

/**
 * Protected Routes (Admin)
 */

// POST - Award badge
router.post('/badges/award', verifyRole(['admin', 'super_admin']), badgesController.awardBadge);

module.exports = router;
