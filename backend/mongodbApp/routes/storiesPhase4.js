/**
 * Stories Routes - Phase 4
 * 6 endpoints for user stories management
 */

const express = require('express');
const router = express.Router();
const storiesController = require('../controllers/storiesControllerPhase4');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Get user's own stories
router.get('/my-stories', verifyToken, storiesController.getMyStories);

// Get stories from specific user
router.get('/user/:userId', optionalAuth, storiesController.getUserStories);

// Create new story
router.post('/', verifyToken, storiesController.createStory);

// Get single story
router.get('/:id', optionalAuth, storiesController.getStory);

// Delete story
router.delete('/:id', verifyToken, storiesController.deleteStory);

// Record view on story
router.post('/:id/view', optionalAuth, storiesController.viewStory);

module.exports = router;
