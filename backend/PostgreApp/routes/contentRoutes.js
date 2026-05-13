const express = require('express');
const router = express.Router();

// Simple test route to verify the router works
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Content routes working' });
});

const contentController = require('../controllers/contentController');
const { auth } = require('../middleware/auth');

// CMS Pages
router.get('/', contentController.getAllPages);
router.get('/:slug', contentController.getPageBySlug);
router.post('/', auth, contentController.createPage);
router.put('/:id', auth, contentController.updatePage);
router.delete('/:id', auth, contentController.deletePage);
router.post('/:id/publish', auth, contentController.publishPage);

module.exports = router;