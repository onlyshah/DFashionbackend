const express = require('express');
const router = express.Router();
const creatorsController = require('../controllers/creatorsController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole(['admin', 'super_admin']), creatorsController.getAllCreators);
router.get('/:creatorId', creatorsController.getCreatorProfile);
router.get('/verification/pending', auth, requireRole(['admin', 'super_admin']), creatorsController.getPendingVerifications);
router.post('/verification/approve', auth, requireRole(['admin', 'super_admin']), creatorsController.approveVerification);
router.post('/verification/reject', auth, requireRole(['admin', 'super_admin']), creatorsController.rejectVerification);
router.get('/:creatorId/affiliate-products', creatorsController.getAffiliateProducts);
router.post('/:creatorId/affiliate-products', auth, requireRole(['admin', 'super_admin']), creatorsController.setAffiliateProducts);
router.get('/:creatorId/commissions', creatorsController.getCommissions);
router.get('/:creatorId/analytics', creatorsController.getAnalytics);
router.get('/:creatorId/sponsored', creatorsController.getSponsoredProducts);

module.exports = router;