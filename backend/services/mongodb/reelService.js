/**
 * Reel Service - MongoDB Implementation
 * Handles reel-related database operations
 */

const Reel = require('../../models/Reel');

class ReelServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Reel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Reel.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching reels:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const reel = await Reel.findById(id);
      return { success: !!reel, data: reel };
    } catch (error) {
      console.error('MongoDB: Error fetching reel:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const reel = await Reel.create(data);
      return { success: true, data: reel };
    } catch (error) {
      console.error('MongoDB: Error creating reel:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const reel = await Reel.findByIdAndUpdate(id, data, { new: true });
      return { success: !!reel, data: reel };
    } catch (error) {
      console.error('MongoDB: Error updating reel:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Reel.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting reel:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReelServiceMongoDB;
