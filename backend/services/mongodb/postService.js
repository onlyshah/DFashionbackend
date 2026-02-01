/**
 * Post Service - MongoDB Implementation
 * Handles post-related database operations
 */

const Post = require('../../models/Post');

class PostServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Post.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Post.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching posts:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const post = await Post.findById(id);
      return { success: !!post, data: post };
    } catch (error) {
      console.error('MongoDB: Error fetching post:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const post = await Post.create(data);
      return { success: true, data: post };
    } catch (error) {
      console.error('MongoDB: Error creating post:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const post = await Post.findByIdAndUpdate(id, data, { new: true });
      return { success: !!post, data: post };
    } catch (error) {
      console.error('MongoDB: Error updating post:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Post.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting post:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PostServiceMongoDB;
