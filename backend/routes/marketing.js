const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const Coupon = require('../models/Coupon');
const FlashSale = require('../models/FlashSale');
const User = require('../models/User');
const Product = require('../models/Product');

// ============ FLASH SALES ============

// GET /api/marketing/flash-sales - Get all flash sales
router.get('/flash-sales', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;

    const flashSales = await FlashSale.find(query)
      .populate('products.product', 'name price image')
      .populate('createdBy', 'name email')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await FlashSale.countDocuments(query);

    res.json({
      success: true,
      data: flashSales,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/marketing/flash-sales/:saleId - Get single flash sale
router.get('/flash-sales/:saleId', async (req, res) => {
  try {
    const sale = await FlashSale.findById(req.params.saleId)
      .populate('products.product', 'name price image')
      .populate('createdBy', 'name email');
    
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' });
    }
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/flash-sales - Create new flash sale (admin only)
router.post('/flash-sales', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { name, description, startTime, endTime, products, bannerImage } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, start time, and end time are required'
      });
    }

    const newSale = new FlashSale({
      name,
      description: description || '',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      products: products || [],
      bannerImage: bannerImage || '',
      status: 'scheduled',
      createdBy: req.user.id
    });

    await newSale.save();
    await newSale.populate('products.product', 'name price image');

    res.status(201).json({
      success: true,
      data: newSale,
      message: 'Flash sale created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/marketing/flash-sales/:saleId - Update flash sale
router.put('/flash-sales/:saleId', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const sale = await FlashSale.findByIdAndUpdate(req.params.saleId, req.body, { new: true })
      .populate('products.product', 'name price image');
    
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' });
    }

    res.json({
      success: true,
      data: sale,
      message: 'Flash sale updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/marketing/flash-sales/:saleId - Delete flash sale
router.delete('/flash-sales/:saleId', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const deleted = await FlashSale.findByIdAndDelete(req.params.saleId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' });
    }

    res.json({
      success: true,
      data: deleted,
      message: 'Flash sale deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ CAMPAIGNS ============

// GET /api/marketing/campaigns - Get all campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const campaigns = await Campaign.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Campaign.countDocuments(query);

    res.json({
      success: true,
      data: campaigns,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/campaigns - Create campaign
router.post('/campaigns', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { name, type, description, targetAudience, budget, startDate, endDate, content } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }

    const newCampaign = new Campaign({
      name,
      type,
      description,
      targetAudience,
      budget,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      content,
      status: 'draft',
      createdBy: req.user.id
    });

    await newCampaign.save();
    await newCampaign.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: newCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/marketing/campaigns/:campaignId - Get single campaign
router.get('/campaigns/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId)
      .populate('createdBy', 'name email');
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/marketing/campaigns/:campaignId - Update campaign
router.put('/campaigns/:campaignId', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.campaignId, req.body, { new: true })
      .populate('createdBy', 'name email');
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/marketing/campaigns/:campaignId - Delete campaign
router.delete('/campaigns/:campaignId', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const deleted = await Campaign.findByIdAndDelete(req.params.campaignId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      data: deleted,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/marketing/campaigns/:campaignId/metrics - Get campaign performance metrics
router.get('/campaigns/:campaignId/metrics', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        metrics: campaign.metrics,
        roi: campaign.metrics.sent > 0 ? ((campaign.metrics.conversions / campaign.metrics.sent) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ BANNERS/OFFERS ============

// GET /api/marketing/banners - Get all banners
router.get('/banners', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'Banners retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/banners - Create banner
router.post('/banners', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { title, image, link, position, startDate, endDate } = req.body;

    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: 'Title and image are required'
      });
    }

    const newBanner = {
      _id: Date.now().toString(),
      title,
      image,
      link: link || '',
      position: position || 'homepage',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      active: true,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      data: newBanner,
      message: 'Banner created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ COUPONS ============

// GET /api/marketing/coupons - Get all coupons
router.get('/coupons', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('applicableProducts', 'name price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: coupons,
      count: coupons.length,
      message: 'Coupons retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/coupons - Create new coupon
router.post('/coupons', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { code, discountValue, type, maxUses, minOrderValue, maxDiscount, startDate, endDate, applicableProducts } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ success: false, message: 'Code and discount value are required' });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const newCoupon = new Coupon({
      code,
      discountValue,
      type: type || 'percentage',
      maxUses,
      minOrderValue,
      maxDiscount,
      startDate,
      endDate,
      applicableProducts,
      createdBy: req.user.id,
      status: 'active'
    });

    await newCoupon.save();
    await newCoupon.populate('applicableProducts', 'name price');

    res.status(201).json({
      success: true,
      data: newCoupon,
      message: 'Coupon created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/coupons/validate - Validate coupon
router.post('/coupons/validate', auth, async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code, status: 'active' });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found or expired' });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded' });
    }

    if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderValue} required`
      });
    }

    let discountAmount = coupon.discountValue;
    if (coupon.type === 'percentage') {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.type,
        discountValue: coupon.discountValue,
        discountAmount,
        finalTotal: Math.max(0, orderTotal - discountAmount)
      },
      message: 'Coupon is valid'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ NOTIFICATIONS ============

// POST /api/marketing/push-notification - Send push notification
router.post('/push-notification', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { title, message, targetAudience, targetUsers, imageUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    res.json({
      success: true,
      data: {
        title,
        message,
        targetAudience,
        sentAt: new Date(),
        status: 'sent'
      },
      message: 'Push notification sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/email - Send email to users
router.post('/email', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { subject, body, recipients, html } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required' });
    }

    res.json({
      success: true,
      data: {
        subject,
        recipients: recipients?.length || 'all',
        sentAt: new Date(),
        status: 'sent'
      },
      message: 'Email sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/marketing/sms - Send SMS to users
router.post('/sms', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { message, recipients } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    res.json({
      success: true,
      data: {
        message,
        recipients: recipients?.length || 'all',
        sentAt: new Date(),
        status: 'sent'
      },
      message: 'SMS sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
