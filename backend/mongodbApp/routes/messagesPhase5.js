/**
 * Messages/Chat Routes - Phase 5
 * 8 endpoints for messaging management
 */

const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesControllerPhase5');
const { verifyToken } = require('../middleware/auth');

// Get all conversations
router.get('/', verifyToken, messagesController.getConversations);

// Get unread messages count
router.get('/unread/count', verifyToken, messagesController.getUnreadMessagesCount);

// Send message
router.post('/', verifyToken, messagesController.sendMessage);

// Get conversation with messages
router.get('/:conversationId', verifyToken, messagesController.getConversationWithMessages);

// Get messages in conversation
router.get('/:conversationId/messages', verifyToken, messagesController.getMessages);

// Mark conversation as read
router.post('/:conversationId/read', verifyToken, messagesController.markConversationAsRead);

// Send typing indicator
router.post('/:conversationId/typing', verifyToken, messagesController.sendTypingIndicator);

// Delete conversation
router.delete('/:conversationId', verifyToken, messagesController.deleteConversation);

module.exports = router;
