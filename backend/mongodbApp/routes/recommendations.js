const express = require('express');
const router = express.Router();
const recommendationsController = require('../controllers/recommendationsController');
const { auth, allowResourceOwnerOrRoles } = require('../middleware/auth');

router.get('/trending', recommendationsController.getTrendingProducts);
router.get('/for-you', auth, recommendationsController.getPersonalizedRecommendations);
router.get('/suggested', recommendationsController.getSuggestedProducts);
router.get('/category/:category', recommendationsController.getCategoryRecommendations);
router.get('/similar/:productId', recommendationsController.getSimilarProducts);
router.get('/recent/:userId', recommendationsController.getRecentProducts);
router.post('/track-view', auth, recommendationsController.trackView);
router.post('/track-search', recommendationsController.trackSearch);
router.post('/track-purchase', recommendationsController.trackPurchase);
router.post('/track-interaction', auth, recommendationsController.trackInteraction);
router.get('/user-analytics/:userId', auth, allowResourceOwnerOrRoles('User', 'userId', '_id', ['admin', 'super_admin']), recommendationsController.getUserAnalytics);
router.get('/insights/:userId', auth, allowResourceOwnerOrRoles('User', 'userId', '_id', ['super_admin']), recommendationsController.getInsights);

module.exports = router;