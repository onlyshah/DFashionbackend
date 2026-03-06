/**
 * 🎥 CMS Media Controller
 * Purpose: Handle media file management for CMS (images, videos)
 * Uses: PostgreSQL/Sequelize with models_sql and Upload model
 */

const models = require('../models_sql');
const { Op, fn, col } = require('sequelize');
const path = require('path');
const fs = require('fs');

/**
 * Get all media files
 */
const getAllMedia = async (req, res) => {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    
    if (!sequelize) {
      return res.status(500).json({ success: false, message: 'Database connection failed' });
    }

    const { search, fileType, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit) || 20;

    let whereClause = 'WHERE is_active = true';
    let params = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (LOWER(file_name) LIKE $${paramCount} OR LOWER(upload_status) LIKE $${paramCount + 1})`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      paramCount += 2;
    }

    if (fileType) {
      whereClause += ` AND file_type = $${paramCount}`;
      params.push(fileType);
    }

    const countQuery = `SELECT COUNT(*) as total FROM uploads ${whereClause}`;
    const selectQuery = `SELECT id, file_name as "fileName", file_size as "fileSize", file_type as "fileType", upload_path as "uploadPath", upload_status as "uploadStatus", uploaded_at as "uploadedAt", created_at as "createdAt", updated_at as "updatedAt" FROM uploads ${whereClause} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${skip}`;

    const countResult = await sequelize.query(countQuery, { replacements: params, type: sequelize.QueryTypes.SELECT });
    const media = await sequelize.query(selectQuery, { replacements: params, type: sequelize.QueryTypes.SELECT });
    
    const total = parseInt(countResult[0]?.total || 0);
    const currentPage = page;
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: media.map(item => ({ ...item, fileSize: item.fileSize ? `${(item.fileSize / 1024).toFixed(2)} KB` : '0 KB' })),
      total,
      pagination: { currentPage, totalPages, pageSize: limitNum, totalRecords: total }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch media', error: error.message });
  }
};

/**
 * Get media file by ID
 */
const getMediaById = async (req, res) => {
  try {
    const Upload = models._raw?.Upload || models.Upload;
    const { id } = req.params;

    const media = await Upload.findByPk(id, {
      attributes: ['id', 'fileName', 'fileSize', 'fileType', 'uploadPath', 'uploadStatus', 'uploadedAt', 'createdAt']
    });

    if (!media) {
      return res.status(404).json({ success: false, message: 'Media file not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...media.toJSON(),
        fileSize: `${(media.fileSize / 1024).toFixed(2)} KB`,
        uploadedAt: media.uploadedAt || media.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch media', error: error.message });
  }
};

/**
 * Upload new media file
 */
const uploadMedia = async (req, res) => {
  try {
    const Upload = models._raw?.Upload || models.Upload;

    if (!req.file) {
      return res.status(422).json({ success: false, message: 'No file provided' });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;

    const media = await Upload.create({
      fileName: originalname,
      fileSize: size,
      fileType: mimetype.split('/')[0], // 'image' or 'video'
      uploadPath: filePath,
      uploadStatus: 'completed',
      uploadedAt: new Date(),
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Media file uploaded successfully',
      data: {
        ...media.toJSON(),
        fileSize: `${(media.fileSize / 1024).toFixed(2)} KB`
      }
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload media', error: error.message });
  }
};

/**
 * Delete media file
 */
const deleteMedia = async (req, res) => {
  try {
    const Upload = models._raw?.Upload || models.Upload;
    const { id } = req.params;

    const media = await Upload.findByPk(id);
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media file not found' });
    }

    // Delete file from disk if it exists
    if (media.uploadPath && fs.existsSync(media.uploadPath)) {
      try {
        fs.unlinkSync(media.uploadPath);
      } catch (fsError) {
        console.warn('Warning: Could not delete file from disk:', fsError.message);
      }
    }

    // Mark as inactive or delete from database
    await media.destroy();

    return res.status(200).json({
      success: true,
      message: 'Media file deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete media', error: error.message });
  }
};

module.exports = {
  getAllMedia,
  getMediaById,
  uploadMedia,
  deleteMedia
};
