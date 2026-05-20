/**
 * Live Shopping Routes - Phase 7
 * Routes: /api/v1/live-shopping
 */

const express = require('express');
const router = express.Router();
const liveController = require('../controllers/liveControllerPhase7');
const { verifyToken, verifyRole, optionalAuth } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get all live sessions
router.get('/sessions', liveController.getLiveSessions);

/**
 * Protected Routes (User/Vendor)
 */

router.use(verifyToken);

// POST - Start live session
router.post('/sessions', verifyRole(['vendor', 'admin']), liveController.startLiveSession);

// PATCH - End live session
router.patch('/sessions/:sessionId/end', liveController.endLiveSession);

// POST - Join live session
router.post('/sessions/:sessionId/join', liveController.joinLiveSession);

// GET - Get session chat messages
router.get('/sessions/:sessionId/chat', liveController.getSessionChat);

module.exports = router;
