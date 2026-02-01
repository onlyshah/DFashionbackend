/**
 * Post Service - PostgreSQL Implementation
 * Handles post-related database operations
 */

const { Post } = require('../../models_sql');

class PostServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Post.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching posts:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const post = await Post.findByPk(id);
      return { success: !!post, data: post };
    } catch (error) {
      console.error('PostgreSQL: Error fetching post:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const post = await Post.create(data);
      return { success: true, data: post };
    } catch (error) {
      console.error('PostgreSQL: Error creating post:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Post.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const post = await Post.findByPk(id);
      return { success: true, data: post };
    } catch (error) {
      console.error('PostgreSQL: Error updating post:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Post.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting post:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PostServicePostgres;
