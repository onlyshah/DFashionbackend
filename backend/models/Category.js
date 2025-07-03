const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  subcategories: [{
    name: {
      type: String,
      required: true
    },
    slug: {
      type: String,
      required: true
    },
    description: String,
    image: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String]
  },
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    productCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for better performance
categorySchema.index({ slug: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentCategory: 1 });

// Virtual for full path
categorySchema.virtual('fullPath').get(function() {
  return this.parentCategory ? `${this.parentCategory.name} > ${this.name}` : this.name;
});

module.exports = mongoose.model('Category', categorySchema);
