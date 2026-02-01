/**
 * Content Service - MongoDB Implementation
 * Handles content-related database operations
 */

const Content = require('../../models/Content');

class ContentServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Content.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Content.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching content:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const content = await Content.findById(id);
      return { success: !!content, data: content };
    } catch (error) {
      console.error('MongoDB: Error fetching content:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const content = await Content.create(data);
      return { success: true, data: content };
    } catch (error) {
      console.error('MongoDB: Error creating content:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const content = await Content.findByIdAndUpdate(id, data, { new: true });
      return { success: !!content, data: content };
    } catch (error) {
      console.error('MongoDB: Error updating content:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Content.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting content:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ContentServiceMongoDB;
