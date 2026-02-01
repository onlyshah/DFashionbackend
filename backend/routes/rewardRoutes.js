const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { auth, requireRole } = require('../middleware/auth');

// Rewards - place specific routes before generic :id routes
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Reward routes working' });
});

router.get('/', auth, rewardController.getUserRewards);
router.post('/claim/:id', auth, rewardController.claimReward);
router.get('/redeem/:id', auth, rewardController.redeemReward);
router.get('/:id', auth, rewardController.getRewardDetails);
router.post('/create', auth, requireRole('admin'), rewardController.createReward);
router.put('/:id', auth, requireRole('admin'), rewardController.updateReward);
router.delete('/:id', auth, requireRole('admin'), rewardController.deleteReward);

module.exports = router;

module.exports = router;