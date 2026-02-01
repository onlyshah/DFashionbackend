const express = require('express');
const router = express.Router();
const storiesController = require('../controllers/storiesController');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, storiesController.getAllStories);
router.post('/', auth, storiesController.createStory);
router.get('/:storyId', optionalAuth, storiesController.getStoryById);
router.put('/:storyId', auth, storiesController.updateStory);
router.delete('/:storyId', auth, storiesController.deleteStory);
router.post('/:storyId/view', auth, storiesController.recordStoryView);
router.post('/:id/like', auth, storiesController.likeStory);
router.post('/:id/share', auth, storiesController.shareStory);
router.post('/:id/comment', auth, storiesController.commentOnStory);
router.get('/:id/comments', storiesController.getStoryComments);

module.exports = router;