const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LiveStreamSchema = new Schema({
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['scheduled','live','ended'], default: 'scheduled' },
  scheduledAt: { type: Date },
  startedAt: { type: Date },
  endedAt: { type: Date },
  thumbnailUrl: { type: String },
  videoUrl: { type: String },
  viewerCount: { type: Number, default: 0 },
  products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  comments: [{ userId: Schema.Types.ObjectId, text: String, timestamp: Date }]
}, { timestamps: true });

module.exports = mongoose.model('LiveStream', LiveStreamSchema);
