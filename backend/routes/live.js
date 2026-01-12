const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const LiveStream = require('../models/LiveStream');
const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/live - Get all active live streams
router.get('/', async (req, res) => {
  try {
    const activeStreams = await LiveStream.find({ status: 'live' })
      .populate('createdBy', 'name avatar email')
      .populate('pinnedProducts', 'name price image')
      .sort({ startedAt: -1 });
    
    res.json({
      success: true,
      data: activeStreams,
      count: activeStreams.length,
      message: 'Live streams retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/live/:streamId - Get single live stream details
router.get('/:streamId', async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId)
      .populate('createdBy', 'name avatar email')
      .populate('pinnedProducts', 'name price image')
      .populate('viewers', 'name avatar');
    
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Live stream not found' });
    }
    
    res.json({ success: true, data: stream });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/live/start - Start a new live stream (vendor/creator only)
router.post('/start', auth, requireRole(['vendor', 'end_user']), async (req, res) => {
  try {
    const { title, description, category, thumbnail } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const newStream = new LiveStream({
      title,
      description: description || '',
      category: category || 'general',
      thumbnail: thumbnail || '',
      createdBy: req.user.id,
      status: 'live',
      startedAt: new Date(),
      viewers: [req.user.id],
      totalViews: 1
    });

    await newStream.save();
    await newStream.populate('createdBy', 'name avatar email');

    res.status(201).json({
      success: true,
      data: newStream,
      message: 'Live stream started successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/live/:streamId/end - End a live stream
router.put('/:streamId/end', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Live stream not found' });
    }

    if (stream.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    res.json({
      success: true,
      data: stream,
      message: 'Live stream ended successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/live/:streamId/pin-product - Add product to live stream
router.post('/:streamId/pin-product', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Live stream not found' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (!stream.pinnedProducts.includes(productId)) {
      stream.pinnedProducts.push(productId);
      await stream.save();
      await stream.populate('pinnedProducts', 'name price image');
    }

    res.json({
      success: true,
      data: stream,
      message: 'Product pinned to live stream'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/live/:streamId/pin-product/:productId - Remove pinned product
router.delete('/:streamId/pin-product/:productId', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Live stream not found' });
    }

    stream.pinnedProducts = stream.pinnedProducts.filter(p => p.toString() !== req.params.productId);
    await stream.save();

    res.json({
      success: true,
      data: stream,
      message: 'Product removed from live stream'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/live/:streamId/viewers - Get active viewers count
router.get('/:streamId/viewers', async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId).populate('viewers', 'name avatar');
    
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Live stream not found' });
    }

    res.json({
      success: true,
      data: {
        streamId: stream._id,
        viewers: stream.viewers,
        viewerCount: stream.viewers.length,
        status: stream.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/live/trending - Get trending live streams
router.get('/trending', async (req, res) => {
  try {
    const trending = await LiveStream.find({ status: 'live' })
      .populate('createdBy', 'name avatar email')
      .sort({ totalViews: -1 })
      .limit(10);

    res.json({
      success: true,
      data: trending,
      message: 'Trending live streams retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
