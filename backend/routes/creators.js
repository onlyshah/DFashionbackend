const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

// ============ CREATOR PROFILES ============

// GET /api/creators - Get all creators/influencers
router.get('/', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const query = { role: 'end_user', isCreator: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.creatorStatus = status;
    }

    const creators = await User.find(query)
      .select('name email username avatar followers followerCount creatorStatus isVerified createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ followerCount: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: creators,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/creators/:creatorId - Get single creator profile
router.get('/:creatorId', async (req, res) => {
  try {
    const creator = await User.findById(req.params.creatorId)
      .select('name email username avatar bio followers followerCount isVerified creatorStatus createdAt');

    if (!creator || creator.role !== 'end_user' || !creator.isCreator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({ success: true, data: creator });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CREATOR VERIFICATION ============

// GET /api/creators/verification/pending - Get pending verification requests
router.get('/verification/pending', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const requests = await User.find({
      role: 'end_user',
      isCreator: true,
      creatorStatus: 'pending_verification'
    })
      .select('name email username avatar followerCount kycDocuments createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({
      role: 'end_user',
      isCreator: true,
      creatorStatus: 'pending_verification'
    });

    res.json({
      success: true,
      data: requests,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/creators/verification/approve - Approve creator verification
router.post('/verification/approve', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { creatorId, comments } = req.body;

    const creator = await User.findByIdAndUpdate(
      creatorId,
      {
        creatorStatus: 'verified',
        isVerified: true,
        verificationApprovedAt: new Date(),
        verificationApprovedBy: req.user.id,
        verificationComments: comments
      },
      { new: true }
    ).select('name email creatorStatus isVerified');

    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({
      success: true,
      data: creator,
      message: 'Creator verified successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/creators/verification/reject - Reject creator verification
router.post('/verification/reject', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { creatorId, reason } = req.body;

    const creator = await User.findByIdAndUpdate(
      creatorId,
      {
        creatorStatus: 'rejected',
        verificationRejectedAt: new Date(),
        verificationRejectedBy: req.user.id,
        verificationRejectionReason: reason
      },
      { new: true }
    ).select('name email creatorStatus');

    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({
      success: true,
      data: creator,
      message: 'Creator verification rejected'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ AFFILIATE PRODUCTS ============

// GET /api/creators/:creatorId/affiliate-products - Get creator's affiliate products
router.get('/:creatorId/affiliate-products', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const creator = await User.findById(req.params.creatorId)
      .select('affiliateProducts')
      .populate({
        path: 'affiliateProducts',
        select: 'name price image category commission',
        options: { skip: (page - 1) * limit, limit: parseInt(limit) }
      });

    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({
      success: true,
      data: creator.affiliateProducts || [],
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/creators/:creatorId/affiliate-products - Add affiliate product
router.post('/:creatorId/affiliate-products', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { productId, commission } = req.body;

    const creator = await User.findByIdAndUpdate(
      req.params.creatorId,
      {
        $addToSet: {
          affiliateProducts: { product: productId, commission, addedAt: new Date() }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      data: creator,
      message: 'Affiliate product added'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ COMMISSIONS ============

// GET /api/creators/:creatorId/commissions - Get creator commissions
router.get('/:creatorId/commissions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const query = { creatorId: req.params.creatorId };

    if (status) {
      query.status = status;
    }

    const commissions = await User.findById(req.params.creatorId)
      .select('creatorCommissions')
      .populate({
        path: 'creatorCommissions',
        match: query,
        options: { skip: (page - 1) * limit, limit: parseInt(limit), sort: { createdAt: -1 } }
      });

    if (!commissions) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({
      success: true,
      data: commissions.creatorCommissions || [],
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/creators/analytics - Get creator performance analytics
router.get('/:creatorId/analytics', async (req, res) => {
  try {
    const creator = await User.findById(req.params.creatorId)
      .select('name followerCount engagementRate conversionRate totalEarnings creatorMetrics');

    if (!creator || creator.role !== 'end_user' || !creator.isCreator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({
      success: true,
      data: {
        creatorId: creator._id,
        name: creator.name,
        followers: creator.followerCount || 0,
        metrics: creator.creatorMetrics || {
          totalViews: 0,
          totalClicks: 0,
          totalConversions: 0,
          engagementRate: 0,
          conversionRate: 0,
          totalEarnings: 0,
          lastUpdated: new Date()
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/creators/sponsored - Get sponsored content
router.get('/:creatorId/sponsored', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const creator = await User.findById(req.params.creatorId)
      .select('sponsoredContent')
      .populate({
        path: 'sponsoredContent',
        options: { skip: (page - 1) * limit, limit: parseInt(limit), sort: { createdAt: -1 } }
      });

    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    res.json({
      success: true,
      data: creator.sponsoredContent || [],
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
