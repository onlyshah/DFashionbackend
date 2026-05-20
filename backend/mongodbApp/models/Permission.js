const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PermissionSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  module: { type: String, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Permission', PermissionSchema);
