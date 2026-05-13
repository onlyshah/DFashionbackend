/**
 * Story Model - Temporary/Ephemeral Content
 * Instagram/WhatsApp Stories-style content that disappears after 24 hours
 * Available to all content creators
 */
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Story', {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      defaultValue: DataTypes.UUIDV4,
      comment: 'Unique story identifier'
    },
    
    // Creator reference
    userId: { 
      type: DataTypes.UUID, 
      allowNull: false,
      field: 'user_id',
      comment: 'User who created this story'
    },
    
    // Media content
    mediaUrl: { 
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'media_url',
      comment: 'URL to image or video'
    },
    
    mediaType: {
      type: DataTypes.ENUM('image', 'video'),
      defaultValue: 'image',
      field: 'media_type',
      comment: 'Type of media (image or video)'
    },
    
    // Metadata
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Story caption/text overlay'
    },
    
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Video duration in seconds (if video)'
    },
    
    contentType: {
      type: DataTypes.ENUM('outfit_showcase', 'product_feature', 'behind_the_scenes', 'poll', 'question', 'promo'),
      defaultValue: 'outfit_showcase',
      field: 'content_type',
      comment: 'Type of story content'
    },
    
    // Product references
    productIds: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'product_ids',
      comment: 'Array of product IDs tagged in this story'
    },
    
    // Expiration
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
      comment: 'When the story will expire (typically 24 hours after creation)'
    },
    
    // Engagement metrics
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'views_count',
      comment: 'Total number of views'
    },
    
    repliesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'replies_count',
      comment: 'Total number of direct message replies'
    },
    
    sharesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shares_count',
      comment: 'Total number of shares'
    },
    
    // Monetization
    isMonetized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_monetized',
      comment: 'Whether this story generates revenue'
    },
    
    earnings: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Revenue generated from this story'
    },
    
    // Status
    status: {
      type: DataTypes.ENUM('active', 'expired', 'deleted'),
      defaultValue: 'active',
      comment: 'Story status (auto-expire after 24h)'
    }
    
  }, { 
    tableName: 'stories', 
    timestamps: true, 
    underscored: true,
    createdAt: 'created_at', 
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['expires_at'] },
      { fields: ['created_at'] }
    ]
  });
};
