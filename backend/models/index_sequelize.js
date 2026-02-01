/**
 * ============================================================================
 * SEQUELIZE MODELS - PostgreSQL Data Models
 * ============================================================================
 * Purpose: Define all database models using Sequelize ORM
 * Auto-synced with the PostgreSQL schema
 */

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize all models
 */
const initializeModels = (sequelize) => {
  const models = {};

  // ========================================================================
  // CORE SYSTEM MODELS
  // ========================================================================

  models.Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    display_name: DataTypes.STRING(100),
    description: DataTypes.TEXT,
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    underscored: true
  });

  models.Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    display_name: DataTypes.STRING(150),
    description: DataTypes.TEXT,
    module: DataTypes.STRING(50),
    action: DataTypes.STRING(50)
  }, {
    tableName: 'permissions',
    timestamps: true,
    underscored: true
  });

  models.RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    }
  }, {
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true
  });

  // ========================================================================
  // USER & AUTHENTICATION
  // ========================================================================

  models.User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    full_name: DataTypes.STRING(150),
    avatar_url: DataTypes.TEXT,
    bio: DataTypes.TEXT,
    department: DataTypes.STRING(50),
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_verification_token: DataTypes.STRING(255),
    email_verified_at: DataTypes.DATE,
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    account_locked_until: DataTypes.DATE,
    password_reset_token: DataTypes.STRING(255),
    password_reset_expires: DataTypes.DATE,
    last_login_at: DataTypes.DATE,
    last_activity_at: DataTypes.DATE,
    deleted_at: DataTypes.DATE
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  models.UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    token_jti: {
      type: DataTypes.STRING(255),
      unique: true
    },
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.TEXT,
    device_info: DataTypes.JSONB,
    expires_at: DataTypes.DATE,
    revoked_at: DataTypes.DATE
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    underscored: true
  });

  models.LoginAttempt = sequelize.define('LoginAttempt', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    email: DataTypes.STRING(100),
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.TEXT,
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    failure_reason: DataTypes.STRING(255)
  }, {
    tableName: 'login_attempts',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // ========================================================================
  // CREATOR PROFILE
  // ========================================================================

  models.CreatorProfile = sequelize.define('CreatorProfile', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    display_name: DataTypes.STRING(100),
    category: DataTypes.STRING(50),
    follower_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    bio: DataTypes.TEXT,
    website_url: DataTypes.TEXT,
    verified_at: DataTypes.DATE,
    is_verified_creator: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verification_badge: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    bank_account_linked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    payout_method: DataTypes.STRING(50),
    total_earnings: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    pending_earnings: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    last_payout_date: DataTypes.DATE,
    total_posts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_reels: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_stories: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    engagement_rate: DataTypes.DECIMAL(5, 2)
  }, {
    tableName: 'creator_profiles',
    timestamps: true,
    underscored: true
  });

  // ========================================================================
  // SELLER PROFILE
  // ========================================================================

  models.SellerProfile = sequelize.define('SellerProfile', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    shop_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    shop_description: DataTypes.TEXT,
    shop_logo_url: DataTypes.TEXT,
    shop_banner_url: DataTypes.TEXT,
    verification_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    },
    verification_document_url: DataTypes.TEXT,
    verified_at: DataTypes.DATE,
    verification_rejected_reason: DataTypes.TEXT,
    business_type: DataTypes.STRING(50),
    gst_number: DataTypes.STRING(50),
    pan_number: DataTypes.STRING(50),
    business_address: DataTypes.TEXT,
    business_email: DataTypes.STRING(100),
    business_phone: DataTypes.STRING(20),
    bank_account_number: DataTypes.STRING(50),
    bank_ifsc_code: DataTypes.STRING(20),
    bank_account_holder_name: DataTypes.STRING(100),
    commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 15.0
    },
    total_sales: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_payouts: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    pending_payouts: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_products: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_orders: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    phone_number: DataTypes.STRING(20),
    support_email: DataTypes.STRING(100),
    support_phone: DataTypes.STRING(20)
  }, {
    tableName: 'seller_profiles',
    timestamps: true,
    underscored: true
  });

  // ========================================================================
  // PRODUCTS & CATEGORIES
  // ========================================================================

  models.Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    name: {
      type: DataTypes.STRING(100),
      unique: true
    },
    slug: DataTypes.STRING(100),
    description: DataTypes.TEXT,
    icon_url: DataTypes.TEXT,
    banner_url: DataTypes.TEXT,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    display_order: DataTypes.INTEGER
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true
  });

  models.Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    name: DataTypes.STRING(255),
    slug: DataTypes.STRING(255),
    description: DataTypes.TEXT,
    sku: DataTypes.STRING(100),
    barcode: DataTypes.STRING(50),
    base_price: DataTypes.DECIMAL(12, 2),
    selling_price: DataTypes.DECIMAL(12, 2),
    cost_price: DataTypes.DECIMAL(12, 2),
    discount_percentage: DataTypes.DECIMAL(5, 2),
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    thumbnail_url: DataTypes.TEXT,
    images: DataTypes.JSONB,
    video_url: DataTypes.TEXT,
    quantity_available: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quantity_sold: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_on_sale: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    attributes: DataTypes.JSONB,
    metadata: DataTypes.JSONB,
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    review_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    meta_title: DataTypes.STRING(255),
    meta_description: DataTypes.TEXT,
    meta_keywords: DataTypes.TEXT,
    deleted_at: DataTypes.DATE
  }, {
    tableName: 'products',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  // ========================================================================
  // INVENTORY
  // ========================================================================

  models.Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    warehouse_location: DataTypes.STRING(100),
    quantity_on_hand: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quantity_reserved: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quantity_available: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'inventory',
    timestamps: true,
    underscored: true,
    createdAt: false
  });

  models.InventoryHistory = sequelize.define('InventoryHistory', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    transaction_type: DataTypes.STRING(50),
    quantity_change: DataTypes.INTEGER,
    reference_id: DataTypes.UUID,
    notes: DataTypes.TEXT
  }, {
    tableName: 'inventory_history',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // ========================================================================
  // SHOPPING - CART, WISHLIST
  // ========================================================================

  models.ShoppingCart = sequelize.define('ShoppingCart', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    added_price: DataTypes.DECIMAL(12, 2)
  }, {
    tableName: 'shopping_carts',
    timestamps: true,
    underscored: true
  });

  models.Wishlist = sequelize.define('Wishlist', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    priority: {
      type: DataTypes.STRING(50),
      defaultValue: 'medium'
    }
  }, {
    tableName: 'wishlists',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  // ========================================================================
  // ORDERS & PAYMENTS
  // ========================================================================

  models.Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    order_number: {
      type: DataTypes.STRING(50),
      unique: true
    },
    subtotal: DataTypes.DECIMAL(15, 2),
    tax_amount: DataTypes.DECIMAL(15, 2),
    discount_amount: DataTypes.DECIMAL(15, 2),
    shipping_cost: DataTypes.DECIMAL(15, 2),
    total_amount: DataTypes.DECIMAL(15, 2),
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    },
    payment_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    },
    shipping_address: DataTypes.JSONB,
    billing_address: DataTypes.JSONB,
    shipping_method: DataTypes.STRING(50),
    tracking_number: DataTypes.STRING(100),
    estimated_delivery_date: DataTypes.DATE,
    actual_delivery_date: DataTypes.DATE,
    customer_notes: DataTypes.TEXT,
    admin_notes: DataTypes.TEXT
  }, {
    tableName: 'orders',
    timestamps: true,
    underscored: true
  });

  models.OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    product_name: DataTypes.STRING(255),
    quantity: DataTypes.INTEGER,
    unit_price: DataTypes.DECIMAL(12, 2),
    discount_per_unit: DataTypes.DECIMAL(12, 2),
    tax_per_unit: DataTypes.DECIMAL(12, 2),
    subtotal: DataTypes.DECIMAL(15, 2),
    fulfillment_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'order_items',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    amount: DataTypes.DECIMAL(15, 2),
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'INR'
    },
    payment_method: DataTypes.STRING(50),
    payment_gateway: DataTypes.STRING(50),
    gateway_transaction_id: DataTypes.STRING(255),
    gateway_response: DataTypes.JSONB,
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true
  });

  models.Refund = sequelize.define('Refund', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    reason: DataTypes.STRING(50),
    reason_notes: DataTypes.TEXT,
    refund_amount: DataTypes.DECIMAL(15, 2),
    refund_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'refunds',
    timestamps: true,
    underscored: true
  });

  models.Return = sequelize.define('Return', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    reason: DataTypes.STRING(50),
    reason_details: DataTypes.TEXT,
    images: DataTypes.JSONB,
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'initiated'
    },
    refund_amount: DataTypes.DECIMAL(15, 2),
    pickup_address: DataTypes.JSONB,
    shipping_carrier: DataTypes.STRING(50),
    return_tracking_number: DataTypes.STRING(100)
  }, {
    tableName: 'returns',
    timestamps: true,
    underscored: true
  });

  // ========================================================================
  // SOCIAL FEATURES
  // ========================================================================

  models.Post = sequelize.define('Post', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    caption: DataTypes.TEXT,
    image_urls: DataTypes.JSONB,
    video_url: DataTypes.TEXT,
    video_duration_seconds: DataTypes.INTEGER,
    visibility: {
      type: DataTypes.STRING(50),
      defaultValue: 'public'
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    likes_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comments_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    shares_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hashtags: DataTypes.JSONB,
    mentions: DataTypes.JSONB,
    deleted_at: DataTypes.DATE
  }, {
    tableName: 'posts',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  models.PostLike = sequelize.define('PostLike', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    }
  }, {
    tableName: 'post_likes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.PostComment = sequelize.define('PostComment', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    image_url: DataTypes.TEXT,
    likes_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    replies_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    deleted_at: DataTypes.DATE
  }, {
    tableName: 'post_comments',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  models.CommentLike = sequelize.define('CommentLike', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    }
  }, {
    tableName: 'comment_likes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.PostShare = sequelize.define('PostShare', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    share_message: DataTypes.TEXT,
    shared_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'post_shares',
    timestamps: true,
    underscored: true,
    createdAt: 'shared_at',
    updatedAt: false
  });

  models.Follow = sequelize.define('Follow', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    blocked_by_follower: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    blocked_by_following: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'follows',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.SavedPost = sequelize.define('SavedPost', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    collection_name: {
      type: DataTypes.STRING(100),
      defaultValue: 'Saved'
    }
  }, {
    tableName: 'saved_posts',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.Story = sequelize.define('Story', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    media_url: DataTypes.TEXT,
    media_type: DataTypes.STRING(20),
    text_overlay: DataTypes.TEXT,
    stickers: DataTypes.JSONB,
    filters_applied: DataTypes.JSONB,
    can_reply: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    can_share: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    hidden_viewers: DataTypes.JSONB,
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    replies_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    expires_at: DataTypes.DATE
  }, {
    tableName: 'stories',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.Reel = sequelize.define('Reel', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    video_url: DataTypes.TEXT,
    thumbnail_url: DataTypes.TEXT,
    duration_seconds: DataTypes.INTEGER,
    caption: DataTypes.TEXT,
    likes_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comments_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    shares_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    saves_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hashtags: DataTypes.JSONB,
    is_trending: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'reels',
    timestamps: true,
    underscored: true
  });

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  models.Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    type: DataTypes.STRING(50),
    title: DataTypes.STRING(255),
    message: DataTypes.TEXT,
    reference_id: DataTypes.UUID,
    reference_type: DataTypes.STRING(50),
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: DataTypes.DATE
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.NotificationPreference = sequelize.define('NotificationPreference', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    likes_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    comments_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    follows_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    messages_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    orders_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    promotions_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    email_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    push_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sms_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_frequency: {
      type: DataTypes.STRING(50),
      defaultValue: 'daily'
    }
  }, {
    tableName: 'notification_preferences',
    timestamps: true,
    underscored: true
  });

  // ========================================================================
  // MESSAGING & SUPPORT
  // ========================================================================

  models.DirectMessage = sequelize.define('DirectMessage', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    message_text: DataTypes.TEXT,
    media_url: DataTypes.TEXT,
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: DataTypes.DATE
  }, {
    tableName: 'direct_messages',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.SupportTicket = sequelize.define('SupportTicket', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    ticket_number: {
      type: DataTypes.STRING(50),
      unique: true
    },
    category: DataTypes.STRING(50),
    subject: DataTypes.STRING(255),
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'open'
    },
    priority: {
      type: DataTypes.STRING(50),
      defaultValue: 'normal'
    },
    attachments: DataTypes.JSONB,
    resolved_at: DataTypes.DATE
  }, {
    tableName: 'support_tickets',
    timestamps: true,
    underscored: true
  });

  models.SupportTicketMessage = sequelize.define('SupportTicketMessage', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    message: DataTypes.TEXT,
    attachments: DataTypes.JSONB,
    is_internal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'support_ticket_messages',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // ========================================================================
  // COMPLIANCE & AUDIT
  // ========================================================================

  models.ModerationQueue = sequelize.define('ModerationQueue', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    content_type: DataTypes.STRING(50),
    content_id: DataTypes.UUID,
    reason_for_review: DataTypes.STRING(50),
    report_reason: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    },
    moderator_notes: DataTypes.TEXT,
    action_taken: DataTypes.STRING(50),
    resolved_at: DataTypes.DATE
  }, {
    tableName: 'moderation_queue',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at'
  });

  models.UserReport = sequelize.define('UserReport', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    reason: DataTypes.STRING(100),
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending'
    },
    action_taken: DataTypes.STRING(50),
    resolved_at: DataTypes.DATE
  }, {
    tableName: 'user_reports',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at'
  });

  models.AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    action: DataTypes.STRING(100),
    resource_type: DataTypes.STRING(50),
    resource_id: DataTypes.UUID,
    old_values: DataTypes.JSONB,
    new_values: DataTypes.JSONB,
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.TEXT
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.UserBehavior = sequelize.define('UserBehavior', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    event_type: DataTypes.STRING(50),
    event_data: DataTypes.JSONB,
    referrer: DataTypes.STRING(255),
    device_type: DataTypes.STRING(50),
    ip_address: DataTypes.STRING(45)
  }, {
    tableName: 'user_behavior',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // ========================================================================
  // ANALYTICS
  // ========================================================================

  models.ProductAnalytic = sequelize.define('ProductAnalytic', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    date: DataTypes.DATE,
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cart_additions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    wishlist_additions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    purchases: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    revenue: DataTypes.DECIMAL(15, 2),
    average_rating: DataTypes.DECIMAL(3, 2)
  }, {
    tableName: 'product_analytics',
    timestamps: true,
    underscored: true,
    createdAt: false,
    updatedAt: false
  });

  models.CreatorAnalytic = sequelize.define('CreatorAnalytic', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    date: DataTypes.DATE,
    impressions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reach: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likes_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comments_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    shares_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    earnings: DataTypes.DECIMAL(15, 2)
  }, {
    tableName: 'creator_analytics',
    timestamps: true,
    underscored: true,
    createdAt: false,
    updatedAt: false
  });

  models.SellerPerformance = sequelize.define('SellerPerformance', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    date: DataTypes.DATE,
    orders_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    revenue: DataTypes.DECIMAL(15, 2),
    cancellation_rate: DataTypes.DECIMAL(5, 2),
    return_rate: DataTypes.DECIMAL(5, 2),
    average_rating: DataTypes.DECIMAL(3, 2),
    customer_complaints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    on_time_delivery_rate: DataTypes.DECIMAL(5, 2)
  }, {
    tableName: 'seller_performance',
    timestamps: true,
    underscored: true,
    createdAt: false,
    updatedAt: false
  });

  // ========================================================================
  // PROMOTIONS
  // ========================================================================

  models.PromotionalCampaign = sequelize.define('PromotionalCampaign', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    name: DataTypes.STRING(255),
    description: DataTypes.TEXT,
    discount_type: DataTypes.STRING(50),
    discount_value: DataTypes.DECIMAL(12, 2),
    applicable_categories: DataTypes.JSONB,
    applicable_products: DataTypes.JSONB,
    min_purchase_amount: DataTypes.DECIMAL(12, 2),
    usage_limit: DataTypes.INTEGER,
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'promotional_campaigns',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at'
  });

  models.Coupon = sequelize.define('Coupon', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    code: {
      type: DataTypes.STRING(50),
      unique: true
    },
    discount_type: DataTypes.STRING(50),
    discount_value: DataTypes.DECIMAL(12, 2),
    min_purchase_amount: DataTypes.DECIMAL(12, 2),
    max_discount_amount: DataTypes.DECIMAL(12, 2),
    usage_limit: DataTypes.INTEGER,
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    valid_from: DataTypes.DATE,
    valid_until: DataTypes.DATE,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'coupons',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at'
  });

  models.CouponUsage = sequelize.define('CouponUsage', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    discount_applied: DataTypes.DECIMAL(15, 2)
  }, {
    tableName: 'coupon_usage',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  models.RewardPoints = sequelize.define('RewardPoints', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    total_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    available_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    redeemed_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_updated: DataTypes.DATE
  }, {
    tableName: 'reward_points',
    timestamps: true,
    underscored: true,
    createdAt: false
  });

  models.RewardPointTransaction = sequelize.define('RewardPointTransaction', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    points_amount: DataTypes.INTEGER,
    transaction_type: DataTypes.STRING(50),
    reference_id: DataTypes.UUID,
    reference_type: DataTypes.STRING(50),
    notes: DataTypes.TEXT
  }, {
    tableName: 'reward_point_transactions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // ========================================================================
  // SETUP RELATIONSHIPS
  // ========================================================================

  // User relationships
  models.User.hasOne(models.CreatorProfile, { foreignKey: 'user_id' });
  models.User.hasOne(models.SellerProfile, { foreignKey: 'user_id' });
  models.User.belongsTo(models.Role, { foreignKey: 'role_id' });

  models.Role.hasMany(models.RolePermission, { foreignKey: 'role_id' });
  models.RolePermission.belongsTo(models.Permission, { foreignKey: 'permission_id' });

  // Product relationships
  models.Product.belongsTo(models.Category, { foreignKey: 'category_id' });
  models.Product.belongsTo(models.SellerProfile, { foreignKey: 'seller_id' });
  models.Product.hasOne(models.Inventory, { foreignKey: 'product_id' });

  // Order relationships
  models.Order.belongsTo(models.User, { foreignKey: 'user_id' });
  models.Order.belongsTo(models.SellerProfile, { foreignKey: 'seller_id' });
  models.Order.hasMany(models.OrderItem, { foreignKey: 'order_id' });
  models.OrderItem.belongsTo(models.Product, { foreignKey: 'product_id' });

  // Social relationships
  models.Post.belongsTo(models.User, { foreignKey: 'creator_id', as: 'creator' });
  models.PostLike.belongsTo(models.User, { foreignKey: 'user_id' });
  models.PostLike.belongsTo(models.Post, { foreignKey: 'post_id' });
  models.PostComment.belongsTo(models.Post, { foreignKey: 'post_id' });
  models.PostComment.belongsTo(models.User, { foreignKey: 'author_id', as: 'author' });
  models.PostShare.belongsTo(models.Post, { foreignKey: 'post_id' });
  models.PostShare.belongsTo(models.User, { foreignKey: 'shared_by_user_id', as: 'sharedByUser' });

  models.Follow.belongsTo(models.User, { foreignKey: 'follower_id', as: 'follower' });
  models.Follow.belongsTo(models.User, { foreignKey: 'following_id', as: 'following' });

  models.Story.belongsTo(models.User, { foreignKey: 'creator_id', as: 'creator' });
  models.Reel.belongsTo(models.User, { foreignKey: 'creator_id', as: 'creator' });

  // Notifications
  models.Notification.belongsTo(models.User, { foreignKey: 'recipient_user_id', as: 'recipient' });
  models.Notification.belongsTo(models.User, { foreignKey: 'sender_user_id', as: 'sender' });
  models.NotificationPreference.belongsTo(models.User, { foreignKey: 'user_id' });

  // Support
  models.SupportTicket.belongsTo(models.User, { foreignKey: 'user_id' });
  models.SupportTicket.belongsTo(models.User, { foreignKey: 'assigned_to_user_id', as: 'assignee' });
  models.SupportTicket.hasMany(models.SupportTicketMessage, { foreignKey: 'ticket_id' });
  models.SupportTicketMessage.belongsTo(models.SupportTicket, { foreignKey: 'ticket_id' });
  models.SupportTicketMessage.belongsTo(models.User, { foreignKey: 'author_id', as: 'author' });

  // Analytics
  models.ProductAnalytic.belongsTo(models.Product, { foreignKey: 'product_id' });
  models.CreatorAnalytic.belongsTo(models.CreatorProfile, { foreignKey: 'creator_id' });
  models.SellerPerformance.belongsTo(models.SellerProfile, { foreignKey: 'seller_id' });

  // Promotions
  models.PromotionalCampaign.hasMany(models.Coupon, { foreignKey: 'campaign_id' });
  models.Coupon.hasMany(models.CouponUsage, { foreignKey: 'coupon_id' });
  models.CouponUsage.belongsTo(models.Coupon, { foreignKey: 'coupon_id' });
  models.CouponUsage.belongsTo(models.Order, { foreignKey: 'order_id' });

  models.RewardPoints.belongsTo(models.User, { foreignKey: 'user_id' });
  models.RewardPointTransaction.belongsTo(models.User, { foreignKey: 'user_id' });

  return models;
};

module.exports = {
  initializeModels
};
