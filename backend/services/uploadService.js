const fs = require('fs');
const path = require('path');
const config = require('../config').config;

class UploadService {
  constructor() {
    this.uploadDir = config.upload.path;
    this.maxFileSize = this.parseFileSize(config.upload.maxFileSize);
    this.allowedTypes = config.upload.allowedTypes;
    this.subdirs = ['products', 'users', 'posts', 'stories', 'temp'];
    
    this.initializeDirectories();
  }

  // Initialize upload directories
  initializeDirectories() {
    // Create main upload directory
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Create subdirectories
    this.subdirs.forEach(subdir => {
      const dirPath = path.join(this.uploadDir, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  // Parse file size string to bytes
  parseFileSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) return 5 * 1024 * 1024; // Default 5MB
    return parseFloat(match[1]) * units[match[2].toUpperCase()];
  }

  // Validate file type
  isValidFileType(filename) {
    const fileExt = path.extname(filename).toLowerCase().slice(1);
    return this.allowedTypes.includes(fileExt);
  }

  // Validate file size
  isValidFileSize(size) {
    return size <= this.maxFileSize;
  }

  // Generate unique filename
  generateUniqueFilename(originalName, prefix = 'file') {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(originalName);
    return `${prefix}-${uniqueSuffix}${fileExt}`;
  }

  // Generate file URL
  generateFileUrl(req, filename, subdir = 'temp') {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${subdir}/${filename}`;
  }

  // Move file from temp to permanent location
  async moveFile(tempPath, permanentPath) {
    return new Promise((resolve, reject) => {
      fs.rename(tempPath, permanentPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Copy file
  async copyFile(sourcePath, destinationPath) {
    return new Promise((resolve, reject) => {
      fs.copyFile(sourcePath, destinationPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Delete file
  async deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') reject(err);
        else resolve();
      });
    });
  }

  // Get file info
  getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return { exists: false };
    }
  }

  // Clean up old temporary files (older than 24 hours)
  async cleanupTempFiles() {
    const tempDir = path.join(this.uploadDir, 'temp');
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    try {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteFile(filePath);
          console.log(`Cleaned up old temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Process uploaded file for specific use case
  async processUploadedFile(file, targetSubdir, options = {}) {
    const { 
      prefix = 'file',
      moveFromTemp = false,
      generateThumbnail = false 
    } = options;

    try {
      // Validate file
      if (!this.isValidFileType(file.originalname)) {
        throw new Error(`Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`);
      }

      if (!this.isValidFileSize(file.size)) {
        throw new Error(`File too large. Maximum size: ${config.upload.maxFileSize}`);
      }

      // Generate new filename if needed
      const filename = file.filename || this.generateUniqueFilename(file.originalname, prefix);
      const targetPath = path.join(this.uploadDir, targetSubdir, filename);

      // Move or copy file if needed
      if (moveFromTemp && file.path) {
        await this.moveFile(file.path, targetPath);
      }

      return {
        filename,
        originalName: file.originalname,
        size: file.size,
        path: targetPath,
        subdir: targetSubdir,
        mimetype: file.mimetype
      };
    } catch (error) {
      throw error;
    }
  }

  // Get upload statistics
  getUploadStats() {
    const stats = {};
    
    this.subdirs.forEach(subdir => {
      const dirPath = path.join(this.uploadDir, subdir);
      try {
        const files = fs.readdirSync(dirPath);
        let totalSize = 0;
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const fileStats = fs.statSync(filePath);
          totalSize += fileStats.size;
        });
        
        stats[subdir] = {
          fileCount: files.length,
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
      } catch (error) {
        stats[subdir] = { fileCount: 0, totalSize: 0, totalSizeMB: '0.00' };
      }
    });
    
    return stats;
  }

  // Validate upload request
  validateUploadRequest(files, options = {}) {
    const {
      maxFiles = 10,
      requiredFields = [],
      allowedMimeTypes = []
    } = options;

    const errors = [];

    // Check if files exist
    if (!files || files.length === 0) {
      errors.push('No files uploaded');
      return { isValid: false, errors };
    }

    // Check file count
    if (files.length > maxFiles) {
      errors.push(`Too many files. Maximum ${maxFiles} files allowed`);
    }

    // Validate each file
    files.forEach((file, index) => {
      // Check file type
      if (!this.isValidFileType(file.originalname)) {
        errors.push(`File ${index + 1}: Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`);
      }

      // Check file size
      if (!this.isValidFileSize(file.size)) {
        errors.push(`File ${index + 1}: File too large. Maximum size: ${config.upload.maxFileSize}`);
      }

      // Check MIME type if specified
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`File ${index + 1}: Invalid MIME type. Allowed types: ${allowedMimeTypes.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const uploadService = new UploadService();

// Schedule cleanup of temp files every hour
setInterval(() => {
  uploadService.cleanupTempFiles();
}, 60 * 60 * 1000); // 1 hour

module.exports = uploadService;
