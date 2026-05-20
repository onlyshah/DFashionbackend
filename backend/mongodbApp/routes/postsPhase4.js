/**
 * Posts Routes - Phase 4
 * 9 endpoints for social posts management
 */

const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsControllerPhase4');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Get all posts (public or filtered)
router.get('/', optionalAuth, postsController.getPosts);

// Get feed for logged-in user
router.get('/feed', verifyToken, postsController.getFeedPosts);

// Get user's own posts
router.get('/my-posts', verifyToken, postsController.getMyPosts);

// Create new post
router.post('/', verifyToken, postsController.createPost);

// Get single post
router.get('/:id', optionalAuth, postsController.getPostById);

// Update post
router.put('/:id', verifyToken, postsController.updatePost);

// Delete post
router.delete('/:id', verifyToken, postsController.deletePost);

// Like post
router.post('/:id/like', verifyToken, postsController.likePost);

// Unlike post
router.delete('/:id/like', verifyToken, postsController.unlikePost);

module.exports = router;
