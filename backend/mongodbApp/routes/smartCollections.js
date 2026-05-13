const express = require('express');
const router = express.Router();
const smartCollectionsController = require('../controllers/smartCollectionsController');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/trending', smartCollectionsController.getTrendingCollections);
router.get('/suggested', smartCollectionsController.getSuggestedCollections);
router.get('/influencers', smartCollectionsController.getInfluencers);
router.get('/:collectionId', optionalAuth, smartCollectionsController.getCollectionById);

module.exports = router;