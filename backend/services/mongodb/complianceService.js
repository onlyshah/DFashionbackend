/**
 * Compliance Service - MongoDB Implementation
 * Handles compliance-related database operations
 */

const Compliance = require('../../models/Compliance');

class ComplianceServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Compliance.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Compliance.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching compliance records:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const compliance = await Compliance.findById(id);
      return { success: !!compliance, data: compliance };
    } catch (error) {
      console.error('MongoDB: Error fetching compliance record:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const compliance = await Compliance.create(data);
      return { success: true, data: compliance };
    } catch (error) {
      console.error('MongoDB: Error creating compliance record:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const compliance = await Compliance.findByIdAndUpdate(id, data, { new: true });
      return { success: !!compliance, data: compliance };
    } catch (error) {
      console.error('MongoDB: Error updating compliance record:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Compliance.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting compliance record:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ComplianceServiceMongoDB;
