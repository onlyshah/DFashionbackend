const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin only.'
    });
  }
  next();
};

// @route   GET /api/vendor-verification/pending
// @desc    Get all pending vendor verifications
// @access  Private/Super Admin
router.get('/pending', auth, requireSuperAdmin, async (req, res) => {
  try {
    const pendingVendors = await User.find({
      role: 'vendor',
      'vendorVerification.status': 'pending'
    }).select('username fullName email vendorVerification createdAt');

    res.json({
      success: true,
      data: pendingVendors
    });
  } catch (error) {
    console.error('Get pending vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/vendor-verification/:vendorId
// @desc    Get vendor verification details
// @access  Private/Super Admin
router.get('/:vendorId', auth, requireSuperAdmin, async (req, res) => {
  try {
    const vendor = await User.findById(req.params.vendorId)
      .select('username fullName email vendorVerification createdAt')
      .populate('vendorVerification.verifiedBy', 'username fullName');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Get vendor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/vendor-verification/:vendorId/approve
// @desc    Approve vendor verification
// @access  Private/Super Admin
router.post('/:vendorId/approve', auth, requireSuperAdmin, async (req, res) => {
  try {
    const vendor = await User.findById(req.params.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    if (vendor.vendorVerification.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already approved'
      });
    }

    // Update verification status
    vendor.vendorVerification.status = 'approved';
    vendor.vendorVerification.verifiedBy = req.user.userId;
    vendor.vendorVerification.verifiedAt = new Date();
    vendor.vendorVerification.rejectionReason = undefined;

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor approved successfully',
      data: {
        vendorId: vendor._id,
        status: vendor.vendorVerification.status,
        verifiedAt: vendor.vendorVerification.verifiedAt
      }
    });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/vendor-verification/:vendorId/reject
// @desc    Reject vendor verification
// @access  Private/Super Admin
router.post('/:vendorId/reject', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const vendor = await User.findById(req.params.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    // Update verification status
    vendor.vendorVerification.status = 'rejected';
    vendor.vendorVerification.verifiedBy = req.user.userId;
    vendor.vendorVerification.verifiedAt = new Date();
    vendor.vendorVerification.rejectionReason = reason.trim();

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor rejected successfully',
      data: {
        vendorId: vendor._id,
        status: vendor.vendorVerification.status,
        rejectionReason: vendor.vendorVerification.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/vendor-verification/:vendorId/suspend
// @desc    Suspend vendor
// @access  Private/Super Admin
router.post('/:vendorId/suspend', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    const vendor = await User.findById(req.params.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    // Update verification status
    vendor.vendorVerification.status = 'suspended';
    vendor.vendorVerification.verifiedBy = req.user.userId;
    vendor.vendorVerification.verifiedAt = new Date();
    vendor.vendorVerification.rejectionReason = reason.trim();

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor suspended successfully',
      data: {
        vendorId: vendor._id,
        status: vendor.vendorVerification.status,
        suspensionReason: vendor.vendorVerification.rejectionReason
      }
    });
  } catch (error) {
    console.error('Suspend vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/vendor-verification/stats
// @desc    Get vendor verification statistics
// @access  Private/Super Admin
router.get('/stats', auth, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { role: 'vendor' } },
      {
        $group: {
          _id: '$vendorVerification.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0
    };

    stats.forEach(stat => {
      if (formattedStats.hasOwnProperty(stat._id)) {
        formattedStats[stat._id] = stat.count;
      }
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
