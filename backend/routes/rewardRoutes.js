const express = require('express');
const router = express.Router();

// Simple test route to verify the router works
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Reward routes working' });
});

// TODO: Add reward routes back after fixing middleware issues
// const rewardController = require('../controllers/rewardController');
// const { auth, requireRole } = require('../middleware/auth');

module.exports = router;
