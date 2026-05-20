/**
 * Stories Controller - Complete MongoDB Implementation (Phase 4)
 * 6 methods for user stories management
 */

const Story = require('../models/Story');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create a new story (Authenticated users)
 */
exports.createStory = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { imageUrl, caption, products, duration } = req.body;

    if (!imageUrl) {
      throw new ApiError('Image URL is required', 400, 'VALIDATION_ERROR');
    }

    // Story expires after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
      user: req.user._id,
      imageUrl,
      caption: caption || '',
      products: products || [],
      duration: duration || 5,
      expiresAt
    });

    const populatedStory = await story.populate('user', 'name email avatar').populate('products', 'name price images');

    return ApiResponse.created(res, populatedStory, 'Story created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get single story by ID
 */
exports.getStory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid story ID', 400, 'INVALID_ID');
    }

    const story = await Story.findById(id)
      .populate('user', 'name email avatar')
      .populate('products', 'name price images');

    if (!story) {
      throw new ApiError('Story not found', 404, 'STORY_NOT_FOUND');
    }

    // Check if story has expired
    if (story.expiresAt < new Date()) {
      throw new ApiError('Story has expired', 410, 'STORY_EXPIRED');
    }

    // Record view if user is authenticated
    if (req.user) {
      const userId = req.user._id;
      if (!story.viewedBy.includes(userId)) {
        story.viewedBy.push(userId);
        story.views = story.viewedBy.length;
        await story.save();
      }
    }

    return ApiResponse.success(res, story, 'Story retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Delete story (Owner only)
 */
exports.deleteStory = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid story ID', 400, 'INVALID_ID');
    }

    const story = await Story.findById(id);

    if (!story) {
      throw new ApiError('Story not found', 404, 'STORY_NOT_FOUND');
    }

    if (story.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new ApiError('Not authorized to delete this story', 403, 'FORBIDDEN');
    }

    await Story.findByIdAndDelete(id);

    return ApiResponse.success(res, { id }, 'Story deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. View/Record view on a story
 */
exports.viewStory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid story ID', 400, 'INVALID_ID');
    }

    const story = await Story.findById(id);

    if (!story) {
      throw new ApiError('Story not found', 404, 'STORY_NOT_FOUND');
    }

    // Check if story has expired
    if (story.expiresAt < new Date()) {
      throw new ApiError('Story has expired', 410, 'STORY_EXPIRED');
    }

    // Record view if user is authenticated
    if (req.user) {
      const userId = req.user._id;
      if (!story.viewedBy.includes(userId)) {
        story.viewedBy.push(userId);
        story.views = story.viewedBy.length;
        await story.save();
      }
    }

    return ApiResponse.success(res, { views: story.views, storyId: id }, 'Story view recorded');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get user's own stories
 */
exports.getMyStories = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [stories, total] = await Promise.all([
      Story.find({ user: req.user._id })
        .populate('products', 'name price images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments({ user: req.user._id })
    ]);

    return ApiResponse.paginated(res, stories, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'User stories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get all stories from a specific user
 */
exports.getUserStories = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Only get non-expired stories
    const now = new Date();

    const [stories, total] = await Promise.all([
      Story.find({ user: userId, expiresAt: { $gt: now } })
        .populate('user', 'name email avatar')
        .populate('products', 'name price images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments({ user: userId, expiresAt: { $gt: now } })
    ]);

    return ApiResponse.paginated(res, stories, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'User stories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
