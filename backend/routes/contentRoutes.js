const express = require('express');
const router = express.Router();

// Simple test route to verify the router works
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Content routes working' });
});

// TODO: Add content routes back after fixing middleware issues
// const contentController = require('../controllers/contentController');
// const { auth } = require('../middleware/auth');

module.exports = router;
