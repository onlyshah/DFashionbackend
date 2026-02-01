const express = require('express');
const router = express.Router();
const productCommentsController = require('../controllers/productCommentsController');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/:productId', optionalAuth, productCommentsController.getProductComments);
router.post('/:productId/comment', auth, productCommentsController.addComment);
router.put('/:commentId', auth, productCommentsController.updateComment);
router.delete('/:commentId', auth, productCommentsController.deleteComment);
router.post('/:commentId/reply', auth, productCommentsController.addReply);

module.exports = router;