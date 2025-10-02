const express = require('express');
const router = express.Router();
const contentAPI = require('../controllers/contentAPI');

router.get('/trending', contentAPI.getTrending);
router.get('/featured-brands', contentAPI.getFeaturedBrands);
router.get('/new-arrivals', contentAPI.getNewArrivals);
router.get('/suggested', contentAPI.getSuggested);
router.get('/influencers', contentAPI.getInfluencers);
router.get('/categories', contentAPI.getCategories);

// Style Inspiration CRUD
router.get('/style-inspiration', contentAPI.getStyleInspiration);
router.post('/style-inspiration', contentAPI.createStyleInspiration);
router.put('/style-inspiration/:id', contentAPI.updateStyleInspiration);
router.delete('/style-inspiration/:id', contentAPI.deleteStyleInspiration);

module.exports = router;
