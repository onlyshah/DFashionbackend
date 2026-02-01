const ServiceLoader = require('../utils/serviceLoader');
const uploadService = ServiceLoader.getService('upload');


const { sendResponse, sendError } = require('../utils/response');

class UploadController {
  /**
   * Upload image
   * POST /image
   */
  static async uploadImage(req, res) {
    try {
      if (!req.file) return sendError(res, 'No file provided', 400);
      const file = req.file;
      const upload = await UploadRepository.saveImage({
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: req.user?.id,
        uploadedAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: upload,
        message: 'Image uploaded successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Upload video
   * POST /video
   */
  static async uploadVideo(req, res) {
    try {
      if (!req.file) return sendError(res, 'No file provided', 400);
      const file = req.file;
      const upload = await UploadRepository.saveVideo({
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: req.user?.id,
        uploadedAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: upload,
        message: 'Video uploaded successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Upload document
   * POST /document
   */
  static async uploadDocument(req, res) {
    try {
      if (!req.file) return sendError(res, 'No file provided', 400);
      const file = req.file;
      const upload = await UploadRepository.saveDocument({
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: req.user?.id,
        uploadedAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: upload,
        message: 'Document uploaded successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Bulk upload images
   * POST /bulk/images
   */
  static async bulkUploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) return sendError(res, 'No files provided', 400);
      const uploads = await UploadRepository.bulkSaveImages(
        req.files.map(file => ({
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedBy: req.user?.id,
          uploadedAt: new Date()
        }))
      );
      return sendResponse(res, {
        success: true,
        data: uploads,
        message: `${uploads.length} images uploaded successfully`
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete upload
   * DELETE /:fileId
   */
  static async deleteUpload(req, res) {
    try {
      const { fileId } = req.params;
      await UploadRepository.delete(fileId);
      return sendResponse(res, {
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get user uploads
   * GET /user
   */
  static async getUserUploads(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      const uploads = await UploadRepository.getUserUploads(userId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: uploads,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(uploads.total / limit),
          total: uploads.total
        },
        message: 'User uploads retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get file info
   * GET /:fileId
   */
  static async getFileInfo(req, res) {
    try {
      const { fileId } = req.params;
      const file = await UploadRepository.getFileInfo(fileId);
      if (!file) return sendError(res, 'File not found', 404);
      return sendResponse(res, {
        success: true,
        data: file,
        message: 'File info retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = UploadController;
