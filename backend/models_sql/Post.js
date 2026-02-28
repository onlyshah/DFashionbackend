/**
 * Post Model - Social Media Posts (Hybrid E-commerce + Social)
 * Supports vendor product showcases and user social content
 */
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Post', {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      defaultValue: DataTypes.UUIDV4 
    },
    
    // Creator reference
    userId: { 
      type: DataTypes.UUID, 
      allowNull: false,
      field: 'user_id',
      comment: 'User who created this post (vendor, user, admin)'
    },
    
    // Content fields
    title: { 
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: 'Post title/caption'
    },
    
    content: { 
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Post body content'
    },
    
    // Media
    mediaUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'media_url',
      comment: 'Featured image/media URL for the post'
    },
    
    // Content metadata
    contentType: {
      type: DataTypes.ENUM('product_showcase', 'social_post', 'promotional', 'blog'),
      defaultValue: 'social_post',
      field: 'content_type',
      comment: 'Type of content (product showcase by vendor or social post by user)'
    },
    
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived', 'deleted'),
      defaultValue: 'draft',
      comment: 'Publication status'
    },
    
    // Product references
    productIds: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'product_ids',
      comment: 'Array of product IDs tagged in this post'
    },
    
    // Engagement metrics
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'likes_count',
      comment: 'Total number of likes'
    },
    
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'comments_count',
      comment: 'Total number of comments'
    },
    
    sharesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shares_count',
      comment: 'Total number of shares'
    },
    
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'views_count',
      comment: 'Total number of views'
    },
    
    // Monetization
    isMonetized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_monetized',
      comment: 'Whether this post generates revenue'
    },
    
    earnings: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Revenue generated from this post'
    },
    
    // Publishing
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
      comment: 'When the post was published'
    }
    
  }, { 
    tableName: 'posts', 
    timestamps: true, 
    underscored: true,
    createdAt: 'created_at', 
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['content_type'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });
};
