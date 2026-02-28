/**
 * Reel Model - Short-form Video Content
 * For TikTok/Reels-style short videos (max 60s)
 * Primarily for social content creators and vendors
 */
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Reel', {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      defaultValue: DataTypes.UUIDV4,
      comment: 'Unique reel identifier'
    },
    
    // Creator reference
    userId: { 
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: 'User who created this reel'
    },
    
    // Video content
    videoUrl: { 
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'video_url',
      comment: 'URL to the video file'
    },
    
    thumbnailUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'thumbnail_url',
      comment: 'Thumbnail image URL'
    },
    
    // metadata
    title: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: 'Reel title/caption'
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reel description with hashtags and mentions'
    },
    
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Video duration in seconds'
    },
    
    contentType: {
      type: DataTypes.ENUM('entertainment', 'educational', 'product_demo', 'tutorial', 'promotional'),
      defaultValue: 'entertainment',
      field: 'content_type',
      comment: 'Type of reel content'
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
      comment: 'Array of product IDs tagged in this reel'
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
      comment: 'Whether this reel generates revenue'
    },
    
    earnings: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Revenue generated from this reel'
    },
    
    // Publishing
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
      comment: 'When the reel was published'
    }
    
  }, { 
    tableName: 'reels', 
    timestamps: true, 
    underscored: true,
    createdAt: 'created_at', 
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['content_type'] },
      { fields: ['status'] },
      { fields: ['views_count'] },
      { fields: ['created_at'] }
    ]
  });
};
