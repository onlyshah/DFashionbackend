const fs = require('fs');
const path = require('path');
const models = require('../models_sql');
const uploadService = require('../services/utils/uploadService');
const { sendResponse, sendError } = require('../utils/response');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const publicUploadsRoot = path.join(__dirname, '..', 'public', 'uploads');
const knownSubdirs = ['products', 'posts', 'reels', 'stories', 'users', 'brands', 'avatars', 'temp'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveUploadPath(file) {
  if (!file) return null;
  if (file.path) return file.path;
  const fileName = file.filename || file.fileName;
  const subdir = file.subdir || 'temp';
  if (!fileName) return null;
  return path.join(uploadsRoot, subdir, fileName);
}

function getRelativeUrl(file, subdir) {
  if (!file) return null;
  const fileName = file.filename || file.fileName || path.basename(file.path || '');
  if (!fileName) return null;
  return `/uploads/${subdir}/${fileName}`;
}

function normalizeFileRecord(file, subdir, req) {
  const uploadPath = resolveUploadPath(file);
  const relativeUrl = getRelativeUrl(file, subdir);

  return {
    fileName: file.originalname || file.filename || path.basename(file.path || ''),
    storedName: file.filename || path.basename(file.path || ''),
    fileSize: file.size || 0,
    fileType: file.mimetype || 'application/octet-stream',
    uploadPath: relativeUrl,
    absolutePath: uploadPath,
    url: relativeUrl,
    fullUrl: relativeUrl && req ? `${req.protocol}://${req.get('host')}${relativeUrl}` : relativeUrl,
    uploadedAt: new Date()
  };
}

async function persistUpload(fileRecord, req) {
  const Upload = models._raw?.Upload || models.Upload;
  if (!Upload || !Upload.create) {
    return null;
  }

  try {
    return await Upload.create({
      fileName: fileRecord.storedName,
      fileSize: fileRecord.fileSize,
      fileType: fileRecord.fileType,
      uploadPath: fileRecord.uploadPath,
      uploadStatus: 'completed',
      uploadedAt: fileRecord.uploadedAt,
      isActive: true
    });
  } catch (error) {
    console.warn('[uploadController] Failed to persist upload metadata:', error.message);
    return null;
  }
}

function resolveIncomingFiles(req) {
  if (Array.isArray(req.files) && req.files.length > 0) {
    return req.files;
  }
  if (req.file) {
    return [req.file];
  }
  return [];
}

async function handleUpload(req, res, subdir, multiple = false) {
  try {
    const incomingFiles = resolveIncomingFiles(req);
    if (!incomingFiles.length) {
      return sendError(res, 400, 'No file provided');
    }

    const targetDir = path.join(uploadsRoot, subdir);
    const mirrorDir = path.join(publicUploadsRoot, subdir);
    ensureDir(targetDir);
    ensureDir(mirrorDir);

    const normalized = [];

    for (const file of incomingFiles) {
      const record = normalizeFileRecord(file, subdir, req);
      normalized.push({
        ...record,
        persisted: await persistUpload(record, req)
      });
    }

    if (!multiple && normalized.length > 1) {
      return sendError(res, 400, 'Only one file is allowed for this endpoint');
    }

    const data = multiple ? normalized : normalized[0];
    return sendResponse(res, 201, true, data, multiple ? 'Files uploaded successfully' : 'File uploaded successfully');
  } catch (error) {
    return sendError(res, 500, error.message, error);
  }
}

class UploadController {
  static async uploadImage(req, res) {
    return handleUpload(req, res, 'products', false);
  }

  static async uploadVideo(req, res) {
    return handleUpload(req, res, 'reels', false);
  }

  static async uploadDocument(req, res) {
    return handleUpload(req, res, 'temp', false);
  }

  static async uploadMultiple(req, res) {
    return handleUpload(req, res, 'posts', true);
  }

  static async uploadProductImages(req, res) {
    return handleUpload(req, res, 'products', true);
  }

  static async uploadAvatar(req, res) {
    return handleUpload(req, res, 'avatars', false);
  }

  static async uploadPostMedia(req, res) {
    return handleUpload(req, res, 'posts', false);
  }

  static async uploadStoryMedia(req, res) {
    return handleUpload(req, res, 'stories', false);
  }

  static async deleteFile(req, res) {
    try {
      const { filename } = req.params;
      if (!filename) {
        return sendError(res, 400, 'Filename is required');
      }

      const fileName = decodeURIComponent(filename);
      const candidates = [];

      for (const subdir of knownSubdirs) {
        candidates.push(path.join(uploadsRoot, subdir, fileName));
        candidates.push(path.join(publicUploadsRoot, subdir, fileName));
      }

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
          break;
        }
      }

      const Upload = models._raw?.Upload || models.Upload;
      if (Upload && Upload.destroy) {
        await Upload.destroy({ where: { fileName } });
      }

      return sendResponse(res, 200, true, { filename: fileName }, 'File deleted successfully');
    } catch (error) {
      return sendError(res, 500, error.message, error);
    }
  }

  static async getUserUploads(req, res) {
    try {
      const Upload = models._raw?.Upload || models.Upload;
      if (!Upload || !Upload.findAndCountAll) {
        return sendError(res, 500, 'Upload model unavailable');
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await Upload.findAndCountAll({
        where: { isActive: true },
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset
      });

      return sendResponse(res, 200, true, {
        items: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.max(1, Math.ceil(result.count / Number(limit))),
          total: result.count
        }
      }, 'User uploads retrieved');
    } catch (error) {
      return sendError(res, 500, error.message, error);
    }
  }

  static async getFileInfo(req, res) {
    try {
      const { fileId } = req.params;
      const Upload = models._raw?.Upload || models.Upload;
      if (!Upload) {
        return sendError(res, 500, 'Upload model unavailable');
      }

      const file = await Upload.findByPk(fileId);
      if (!file) {
        return sendError(res, 404, 'File not found');
      }

      return sendResponse(res, 200, true, file, 'File info retrieved');
    } catch (error) {
      return sendError(res, 500, error.message, error);
    }
  }
}

module.exports = UploadController;
