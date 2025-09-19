const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');

// GET /api/collections/trending
router.get('/trending', async (req, res) => {
  const trending = await Product.find({ isTrending: true, isActive: true }).limit(12);
  res.json({ success: true, products: trending });
});

// GET /api/collections/suggested
router.get('/suggested', async (req, res) => {
  const suggested = await Product.find({ isSuggested: true, isActive: true }).limit(12);
  res.json({ success: true, products: suggested });
});

// GET /api/collections/influencers
router.get('/influencers', async (req, res) => {
  const influencers = await User.find({ isInfluencer: true, isActive: true }).limit(12);
  res.json({ success: true, influencers });
});

module.exports = router;
