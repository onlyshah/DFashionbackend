/**
 * 📝 Admin Content Controller (Blogs & Articles)
 * Purpose: Handle admin CMS operations for blog posts and articles
 * Uses: PostgreSQL/Sequelize with models_sql
 */

const models = require('../models_sql');

/**
 * Get all blog posts using raw SQL (avoid model field mapping issues)
 */
const getAllBlogs = async (req, res) => {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    
    if (!sequelize) {
      return res.status(500).json({ success: false, message: 'Database connection failed' });
    }

    const { search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit) || 10;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE LOWER(title) LIKE $1 OR LOWER(content) LIKE $2';
      params = [`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`];
    }

    const countQuery = `SELECT COUNT(*) as total FROM posts ${whereClause}`;
    const selectQuery = `SELECT id, title, content, user_id as "userId", created_at as "createdAt", updated_at as "updatedAt" FROM posts ${whereClause} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${skip}`;

    const countResult = await sequelize.query(countQuery, { replacements: params, type: sequelize.QueryTypes.SELECT });
    const blogs = await sequelize.query(selectQuery, { replacements: params, type: sequelize.QueryTypes.SELECT });
    
    const total = parseInt(countResult[0]?.total || 0);
    const currentPage = page;
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: blogs,
      total,
      pagination: { currentPage, totalPages, pageSize: limitNum, totalRecords: total }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch blogs', error: error.message });
  }
};

/**
 * Get blog post by ID
 */
const getBlogById = async (req, res) => {
  try {
    const Post = models._raw?.Post || models.Post;
    const { id } = req.params;

    const blog = await Post.findByPk(id, {
      attributes: ['id', 'title', 'content', 'mediaUrl', 'createdAt', 'updatedAt', 'userId', 'status']
    });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    return res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch blog', error: error.message });
  }
};

/**
 * Create new blog post
 */
const createBlog = async (req, res) => {
  try {
    const Post = models._raw?.Post || models.Post;
    const { title, content, mediaUrl } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!title || !content) {
      return res.status(422).json({ success: false, message: 'Title and content are required' });
    }

    const blog = await Post.create({
      title,
      content,
      mediaUrl,
      contentType: 'blog',
      status: 'published',
      userId
    });

    return res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).json({ success: false, message: 'Failed to create blog', error: error.message });
  }
};

/**
 * Update blog post
 */
const updateBlog = async (req, res) => {
  try {
    const Post = models._raw?.Post || models.Post;
    const { id } = req.params;
    const { title, content, mediaUrl, status } = req.body;

    const blog = await Post.findByPk(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    await blog.update({
      title: title || blog.title,
      content: content || blog.content,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : blog.mediaUrl,
      status: status || blog.status
    });

    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: blog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).json({ success: false, message: 'Failed to update blog', error: error.message });
  }
};

/**
 * Delete blog post
 */
const deleteBlog = async (req, res) => {
  try {
    const Post = models._raw?.Post || models.Post;
    const { id } = req.params;

    const blog = await Post.findByPk(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    await blog.destroy();

    return res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete blog', error: error.message });
  }
};

module.exports = {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
};
