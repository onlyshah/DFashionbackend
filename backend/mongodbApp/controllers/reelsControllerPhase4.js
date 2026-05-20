/**
 * Reels Controller - Complete MongoDB Implementation (Phase 4)
 * 7 methods for video reels management
 */

const Reel = require('../models/Reel');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create a new reel (Authenticated users)
 */
exports.createReel = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { videoUrl, thumbnail, caption, hashtags, products, visibility } = req.body;

    if (!videoUrl) {
      throw new ApiError('Video URL is required', 400, 'VALIDATION_ERROR');
    }

    if (caption && caption.length > 500) {
      throw new ApiError('Caption cannot exceed 500 characters', 400, 'VALIDATION_ERROR');
    }

    const reel = await Reel.create({
      user: req.user._id,
      videoUrl,
      thumbnail: thumbnail || null,
      caption: caption || '',
      hashtags: hashtags || [],
      products: products || [],
      visibility: visibility || 'public'
    });

    const populatedReel = await reel.populate('user', 'name email avatar').populate('products', 'name price images');

    return ApiResponse.created(res, populatedReel, 'Reel created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get all reels with pagination
 */
exports.getReels = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, userId, visibility = 'public', sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (visibility) filter.visibility = visibility;
    if (userId) filter.user = userId;

    const [reels, total] = await Promise.all([
      Reel.find(filter)
        .populate('user', 'name email avatar')
        .populate('products', 'name price images')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reel.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, reels, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Reels retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single reel by ID
 */
exports.getReel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid reel ID', 400, 'INVALID_ID');
    }

    const reel = await Reel.findById(id)
      .populate('user', 'name email avatar')
      .populate('products', 'name price images');

    if (!reel) {
      throw new ApiError('Reel not found', 404, 'REEL_NOT_FOUND');
    }

    // Increment view count
    await Reel.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return ApiResponse.success(res, reel, 'Reel retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Delete reel (Owner only)
 */
exports.deleteReel = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid reel ID', 400, 'INVALID_ID');
    }

    const reel = await Reel.findById(id);

    if (!reel) {
      throw new ApiError('Reel not found', 404, 'REEL_NOT_FOUND');
    }

    if (reel.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new ApiError('Not authorized to delete this reel', 403, 'FORBIDDEN');
    }

    await Reel.findByIdAndDelete(id);

    return ApiResponse.success(res, { id }, 'Reel deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Like a reel
 */
exports.likeReel = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid reel ID', 400, 'INVALID_ID');
    }

    const reel = await Reel.findById(id);

    if (!reel) {
      throw new ApiError('Reel not found', 404, 'REEL_NOT_FOUND');
    }

    const userId = req.user._id;
    const alreadyLiked = reel.likedBy.includes(userId);

    if (alreadyLiked) {
      throw new ApiError('You already liked this reel', 400, 'ALREADY_LIKED');
    }

    reel.likedBy.push(userId);
    reel.engagement.likes = reel.likedBy.length;

    await reel.save();

    return ApiResponse.success(res, reel, 'Reel liked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Unlike a reel
 */
exports.unlikeReel = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid reel ID', 400, 'INVALID_ID');
    }

    const reel = await Reel.findById(id);

    if (!reel) {
      throw new ApiError('Reel not found', 404, 'REEL_NOT_FOUND');
    }

    const userId = req.user._id;
    const likeIndex = reel.likedBy.indexOf(userId);

    if (likeIndex === -1) {
      throw new ApiError('You have not liked this reel', 400, 'NOT_LIKED');
    }

    reel.likedBy.splice(likeIndex, 1);
    reel.engagement.likes = reel.likedBy.length;

    await reel.save();

    return ApiResponse.success(res, reel, 'Reel unliked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Share a reel
 */
exports.shareReel = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { shareMessage, shareToFollowers } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid reel ID', 400, 'INVALID_ID');
    }

    const reel = await Reel.findById(id);

    if (!reel) {
      throw new ApiError('Reel not found', 404, 'REEL_NOT_FOUND');
    }

    reel.engagement.shares += 1;

    await reel.save();

    // In a real app, this would create notification records or save shares
    const shareData = {
      reelId: id,
      sharedBy: req.user._id,
      message: shareMessage || '',
      sharedToFollowers: shareToFollowers || false,
      timestamp: new Date()
    };

    return ApiResponse.success(res, shareData, 'Reel shared successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
