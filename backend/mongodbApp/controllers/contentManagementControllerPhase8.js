/**
 * Content Management Controller - Complete MongoDB Implementation (Phase 8)
 * 14 methods for CMS and content operations
 */

const Page = require('../models/Page');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get pages
 */
exports.getPages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'published' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = req.user?.role === 'admin' ? {} : { status: 'published' };
    if (status && req.user?.role === 'admin') filter.status = status;

    const [pages, total] = await Promise.all([
      Page.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Page.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, pages, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Pages retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get page by slug
 */
exports.getPageBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const page = await Page.findOne({ slug, status: 'published' }).lean();

    if (!page) {
      throw new ApiError('Page not found', 404, 'PAGE_NOT_FOUND');
    }

    return ApiResponse.success(res, page, 'Page retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Create page
 */
exports.createPage = async (req, res, next) => {
  try {
    const { title, slug, content, seoData, status = 'draft' } = req.body;

    if (!title || !slug || !content) {
      throw new ApiError('Title, slug, and content are required', 400, 'VALIDATION_ERROR');
    }

    const existing = await Page.findOne({ slug });
    if (existing) {
      throw new ApiError('Page with this slug already exists', 400, 'DUPLICATE');
    }

    const page = await Page.create({
      title,
      slug,
      content,
      seoData,
      status,
      createdBy: req.user._id
    });

    return ApiResponse.created(res, page, 'Page created');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update page
 */
exports.updatePage = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    if (!pageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid page ID', 400, 'INVALID_ID');
    }

    const page = await Page.findByIdAndUpdate(
      pageId,
      { $set: req.body },
      { new: true }
    );

    if (!page) {
      throw new ApiError('Page not found', 404, 'PAGE_NOT_FOUND');
    }

    return ApiResponse.success(res, page, 'Page updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete page
 */
exports.deletePage = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    if (!pageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid page ID', 400, 'INVALID_ID');
    }

    await Page.findByIdAndDelete(pageId);

    return ApiResponse.success(res, { id: pageId }, 'Page deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Publish page
 */
exports.publishPage = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    if (!pageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid page ID', 400, 'INVALID_ID');
    }

    const page = await Page.findByIdAndUpdate(
      pageId,
      { $set: { status: 'published', publishedAt: new Date() } },
      { new: true }
    );

    if (!page) {
      throw new ApiError('Page not found', 404, 'PAGE_NOT_FOUND');
    }

    return ApiResponse.success(res, page, 'Page published');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Unpublish page
 */
exports.unpublishPage = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    if (!pageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid page ID', 400, 'INVALID_ID');
    }

    const page = await Page.findByIdAndUpdate(
      pageId,
      { $set: { status: 'draft' } },
      { new: true }
    );

    if (!page) {
      throw new ApiError('Page not found', 404, 'PAGE_NOT_FOUND');
    }

    return ApiResponse.success(res, page, 'Page unpublished');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get blogs
 */
exports.getBlogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, author } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (author) filter.author = author;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'name')
        .sort('-publishedAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, blogs, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Blogs retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get blog by slug
 */
exports.getBlogBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, status: 'published' })
      .populate('author', 'name email')
      .lean();

    if (!blog) {
      throw new ApiError('Blog not found', 404, 'BLOG_NOT_FOUND');
    }

    return ApiResponse.success(res, blog, 'Blog retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Create blog
 */
exports.createBlog = async (req, res, next) => {
  try {
    const { title, content, category, tags = [] } = req.body;

    if (!title || !content) {
      throw new ApiError('Title and content are required', 400, 'VALIDATION_ERROR');
    }

    const slug = title.toLowerCase().replace(/\s+/g, '-');

    const blog = await Blog.create({
      title,
      slug,
      content,
      author: req.user._id,
      category,
      tags,
      status: 'draft'
    });

    return ApiResponse.created(res, blog, 'Blog created');
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Update blog
 */
exports.updateBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;

    if (!blogId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid blog ID', 400, 'INVALID_ID');
    }

    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true }
    );

    if (!blog) {
      throw new ApiError('Blog not found', 404, 'BLOG_NOT_FOUND');
    }

    return ApiResponse.success(res, blog, 'Blog updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 12. Delete blog
 */
exports.deleteBlog = async (req, res, next) => {
  try {
    const { blogId } = req.params;

    if (!blogId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid blog ID', 400, 'INVALID_ID');
    }

    await Blog.findByIdAndDelete(blogId);

    return ApiResponse.success(res, { id: blogId }, 'Blog deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * 13. Get blog comments
 */
exports.getBlogComments = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!blogId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid blog ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      BlogComment.find({ blogId })
        .populate('userId', 'name profilePic')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BlogComment.countDocuments({ blogId })
    ]);

    return ApiResponse.paginated(res, comments, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Blog comments retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 14. Add blog comment
 */
exports.addBlogComment = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { blogId } = req.params;
    const { comment } = req.body;

    if (!blogId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid blog ID', 400, 'INVALID_ID');
    }

    if (!comment) {
      throw new ApiError('Comment text is required', 400, 'VALIDATION_ERROR');
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError('Blog not found', 404, 'BLOG_NOT_FOUND');
    }

    const newComment = await BlogComment.create({
      blogId,
      userId: req.user._id,
      comment,
      createdAt: new Date()
    });

    await newComment.populate('userId', 'name profilePic');

    return ApiResponse.created(res, newComment, 'Comment added');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
