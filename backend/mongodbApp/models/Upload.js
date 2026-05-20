const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UploadSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  originalFilename: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  fileType: { type: String, enum: ['image','video','document'] },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  metadata: { type: Object },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

UploadSchema.index({ userId: 1, fileType: 1 });

module.exports = mongoose.model('Upload', UploadSchema);
