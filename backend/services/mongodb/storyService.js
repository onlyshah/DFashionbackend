/**
 * Story Service - MongoDB Implementation
 * Handles story-related database operations
 */

const Story = require('../../models/Story');

class StoryServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Story.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Story.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching stories:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const story = await Story.findById(id);
      return { success: !!story, data: story };
    } catch (error) {
      console.error('MongoDB: Error fetching story:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const story = await Story.create(data);
      return { success: true, data: story };
    } catch (error) {
      console.error('MongoDB: Error creating story:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const story = await Story.findByIdAndUpdate(id, data, { new: true });
      return { success: !!story, data: story };
    } catch (error) {
      console.error('MongoDB: Error updating story:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Story.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting story:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = StoryServiceMongoDB;
