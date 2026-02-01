const express = require('express');
const router = express.Router();
const liveController = require('../controllers/liveController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', liveController.getActiveLiveStreams);
router.get('/:streamId', liveController.getLiveStreamDetails);
router.post('/start', auth, requireRole(['vendor', 'end_user']), liveController.startLiveStream);
router.put('/:streamId/end', auth, liveController.endLiveStream);
router.post('/:streamId/pin-product', auth, liveController.pinProduct);
router.delete('/:streamId/pin-product/:productId', auth, liveController.removePinnedProduct);
router.get('/:streamId/viewers', liveController.getViewers);
router.get('/trending', liveController.getTrendingStreams);

module.exports = router;