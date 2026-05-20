const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserBehaviorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventType: { type: String },
  resourceId: { type: Schema.Types.ObjectId },
  resourceType: { type: String },
  duration: { type: Number },
  metadata: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserBehavior', UserBehaviorSchema);
