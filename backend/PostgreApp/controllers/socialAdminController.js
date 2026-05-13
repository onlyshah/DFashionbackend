/**
 * ============================================================================
 * SOCIAL ADMIN CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Content moderation, flagging, user bans for social features
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 21
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');

// Get stats
exports.getStats = async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    let stats = { posts: 0, reels: 0, stories: 0, likes: 0, comments: 0, follows: 0, totalEngagement: 0 };

    try {
      const postsRes = await client.query('SELECT COUNT(*) as count FROM posts');
      if (postsRes) stats.posts = parseInt(postsRes.rows[0]?.count || 0);
    } catch (e) {}

    try {
      const likesRes = await client.query('SELECT COUNT(*) as count FROM post_likes');
      if (likesRes) stats.likes = parseInt(likesRes.rows[0]?.count || 0);
    } catch (e) {}

    try {
      const commentsRes = await client.query('SELECT COUNT(*) as count FROM post_comments');
      if (commentsRes) stats.comments = parseInt(commentsRes.rows[0]?.count || 0);
    } catch (e) {}

    stats.totalEngagement = stats.likes + stats.comments + stats.follows;
    await client.end();

    return ApiResponse.success(res, stats, 'Social engagement stats retrieved');
  } catch (error) {
    console.error('[socialAdminController] Error fetching stats:', error);
    return ApiResponse.success(res, {
      posts: 0, reels: 0, stories: 0, likes: 0, comments: 0, follows: 0, totalEngagement: 0
    }, 'Social engagement stats');
  }
};

// Get reported content
exports.getReportedContent = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending', search = '' } = req.query;
    const validated_limit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * validated_limit;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    let whereClause = 'cr.id IS NOT NULL';
    if (status && status !== 'all') whereClause += ` AND cr.status = $1`;
    let paramIndex = (status && status !== 'all') ? 2 : 1;
    if (search) { whereClause += ` AND (cr.reason ILIKE $${paramIndex} OR cr.description ILIKE $${paramIndex})`; paramIndex++; }

    const countQuery = `SELECT COUNT(*) as count FROM content_reports cr WHERE ${whereClause}`;
    let countParams = [];
    if (status && status !== 'all') countParams.push(status);
    if (search) countParams.push(`%${search}%`);
    const countRes = await client.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0]?.count || 0);

    const reportsQuery = `
      SELECT cr.id, cr.content_type, cr.content_id, cr.reason, cr.description, cr.status, cr.created_at, cr.resolved_at,
             u.id as reporter_id, COALESCE(u.first_name, '') as reporter_firstname, COALESCE(u.last_name, '') as reporter_lastname
      FROM content_reports cr LEFT JOIN users u ON cr.reporter_id = u.id
      WHERE ${whereClause} ORDER BY cr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    let params = [];
    if (status && status !== 'all') params.push(status);
    if (search) params.push(`%${search}%`);
    params.push(validated_limit, offset);
    const reportsRes = await client.query(reportsQuery, params);
    await client.end();

    const data = reportsRes.rows.map(report => ({
      id: report.id, content_type: report.content_type, content_id: report.content_id,
      report_reason: report.reason, description: report.description, status: report.status,
      reporter: { id: report.reporter_id, name: `${report.reporter_firstname} ${report.reporter_lastname}`.trim() || 'Anonymous' },
      createdAt: report.created_at, resolvedAt: report.resolved_at
    }));

    return ApiResponse.paginated(res, data, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) },
      'Reported content retrieved successfully');
  } catch (error) {
    console.error('❌ getReportedContent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get report details
exports.getReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const reportQuery = `
      SELECT cr.id, cr.content_type, cr.content_id, cr.reason, cr.description, cr.status, cr.created_at, cr.resolved_at,
             u.id as reporter_id, COALESCE(u.first_name, '') as reporter_firstname, COALESCE(u.last_name, '') as reporter_lastname, u.email as reporter_email
      FROM content_reports cr LEFT JOIN users u ON cr.reporter_id = u.id WHERE cr.id = $1
    `;
    const reportRes = await client.query(reportQuery, [reportId]);
    await client.end();

    if (reportRes.rows.length === 0) return ApiResponse.notFound(res, 'Report');

    const report = reportRes.rows[0];
    const data = {
      id: report.id, content_type: report.content_type, content_id: report.content_id,
      report_reason: report.reason, description: report.description, status: report.status,
      reporter: { id: report.reporter_id, name: `${report.reporter_firstname} ${report.reporter_lastname}`.trim() || 'Anonymous', email: report.reporter_email },
      createdAt: report.created_at, resolvedAt: report.resolved_at
    };

    return ApiResponse.success(res, data, 'Report details retrieved successfully');
  } catch (error) {
    console.error('❌ getReportDetails error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Approve content
exports.approveContent = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can approve content');
    }

    const { report_id } = req.params;
    const { notes } = req.body;

    const report = await models.ContentReport.findByPk(report_id);
    if (!report) return ApiResponse.notFound(res, 'Report');

    const t = await models.sequelize.transaction();
    try {
      await report.update({
        status: 'approved', moderation_action: 'approved', moderator_id: req.user.id, moderation_notes: notes, reviewed_at: new Date()
      }, { transaction: t });

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'approve_content', resource_type: 'ContentReport', resource_id: report_id, details: { notes }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { report_id, status: 'approved', action: 'approved' }, 'Content approved successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ approveContent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Delete content
exports.deleteContent = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can delete content');
    }

    const { report_id } = req.params;
    const { reason } = req.body;
    if (!reason) return ApiResponse.error(res, 'Deletion reason is required', 422);

    const report = await models.ContentReport.findByPk(report_id);
    if (!report) return ApiResponse.notFound(res, 'Report');

    const t = await models.sequelize.transaction();
    try {
      // Mark content as deleted
      let ContentModel;
      switch (report.content_type) {
        case 'post': ContentModel = models.Post; break;
        case 'reel': ContentModel = models.Reel; break;
        case 'story': ContentModel = models.Story; break;
        case 'comment': ContentModel = models.Comment; break;
        default: throw new Error('Unknown content type');
      }

      await ContentModel.update({
        is_deleted: true, deleted_at: new Date(), deleted_by: req.user.id, deletion_reason: reason
      }, { where: { id: report.content_id }, transaction: t });

      // Update report
      await report.update({
        status: 'approved', moderation_action: 'removed', moderator_id: req.user.id, moderation_notes: reason, reviewed_at: new Date()
      }, { transaction: t });

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'delete_content', resource_type: report.content_type, resource_id: report.content_id, details: { reason }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { report_id, content_id: report.content_id, content_type: report.content_type, status: 'deleted' }, 'Content deleted successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ deleteContent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Shadowban user
exports.shadowbanUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can shadowban users');
    }

    const { user_id } = req.params;
    const { reason, duration_days } = req.body;
    if (!reason) return ApiResponse.error(res, 'Shadowban reason is required', 422);

    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');

    const shadowban_until = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;
    const t = await models.sequelize.transaction();

    try {
      if (models.UserShadowban) {
        await models.UserShadowban.create({
          user_id, reason, shadowban_until, created_by: req.user.id, is_active: true
        }, { transaction: t });
      }

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'shadowban_user', resource_type: 'User', resource_id: user_id, details: { reason, duration_days }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { user_id, shadowban_until, status: 'shadowbanned' }, 'User shadowbanned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ shadowbanUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Ban user
exports.banUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can ban users');
    }

    const { user_id } = req.params;
    const { reason } = req.body;
    if (!reason) return ApiResponse.error(res, 'Ban reason is required', 422);

    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');

    const t = await models.sequelize.transaction();
    try {
      await user.update({
        account_status: 'banned', ban_reason: reason, banned_at: new Date(), banned_by: req.user.id
      }, { transaction: t });

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'ban_user', resource_type: 'User', resource_id: user_id, details: { reason }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { user_id, status: 'banned' }, 'User banned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ banUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Warn user
exports.warnUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can warn users');
    }

    const { user_id } = req.params;
    const { reason, violation_type } = req.body;
    if (!reason) return ApiResponse.error(res, 'Warning reason is required', 422);

    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');

    const t = await models.sequelize.transaction();
    try {
      const warning_count = await models.UserWarning.count({
        where: { user_id, created_at: { [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
      });

      if (models.UserWarning) {
        await models.UserWarning.create({
          user_id, reason, violation_type, warning_number: warning_count + 1, created_by: req.user.id
        }, { transaction: t });
      }

      if (warning_count + 1 >= 3) {
        await user.update({ account_status: 'suspended', suspension_reason: 'Multiple content violations' }, { transaction: t });
      }

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'warn_user', resource_type: 'User', resource_id: user_id, details: { reason, violation_type, warning_count: warning_count + 1 }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { user_id, warning_number: warning_count + 1, auto_suspended: warning_count + 1 >= 3 }, 'User warned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ warnUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Manage banned hashtags
exports.manageBannedHashtags = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can manage hashtags');
    }

    const { action, hashtags } = req.body;
    if (!['add', 'remove'].includes(action) || !Array.isArray(hashtags)) {
      return ApiResponse.error(res, 'Invalid request', 422);
    }

    const t = await models.sequelize.transaction();
    try {
      if (action === 'add' && models.BannedHashtag) {
        for (const tag of hashtags) {
          await models.BannedHashtag.findOrCreate({
            where: { hashtag: tag.toLowerCase() },
            defaults: { reason: 'Admin action', created_by: req.user.id }
          });
        }
      } else if (action === 'remove' && models.BannedHashtag) {
        await models.BannedHashtag.destroy({
          where: { hashtag: { [Op.in]: hashtags.map(t => t.toLowerCase()) } },
          transaction: t
        });
      }

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: `${action}_banned_hashtags`, resource_type: 'BannedHashtag', resource_id: null, details: { hashtags, count: hashtags.length }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { action, hashtags_count: hashtags.length }, `Hashtags ${action}ed successfully`);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ manageBannedHashtags error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get all posts
exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const validated_limit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * validated_limit;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    let whereClause = '1=1';
    if (search) whereClause = `(p.title ILIKE $1 OR p.content ILIKE $1)`;

    const countQuery = `SELECT COUNT(*) as count FROM posts p WHERE ${whereClause}`;
    const countRes = search ? await client.query(countQuery, [`%${search}%`]) : await client.query(countQuery);
    const total = parseInt(countRes.rows[0]?.count || 0);

    const postsQuery = `
      SELECT p.id, p.user_id, p.title, p.content, p.created_at, p.updated_at,
             COALESCE(u.first_name, '') as creator_firstname, COALESCE(u.last_name, '') as creator_lastname
      FROM posts p LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereClause} ORDER BY p.created_at DESC LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}
    `;
    const params = search ? [`%${search}%`, validated_limit, offset] : [validated_limit, offset];
    const postsRes = await client.query(postsQuery, params);
    await client.end();

    const data = postsRes.rows.map(post => {
      const creatorName = post.creator_firstname || post.creator_lastname ? `${post.creator_firstname} ${post.creator_lastname}`.trim() : null;
      return { id: post.id, title: post.title, caption: post.content, creator: post.user_id ? { id: post.user_id, name: creatorName } : null, createdAt: post.created_at };
    });

    return ApiResponse.paginated(res, data, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) },
      'Posts retrieved successfully');
  } catch (error) {
    console.error('❌ getAllPosts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get post by ID
exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await models.Post.findByPk(postId, {
      include: [{ model: models.User, attributes: ['id', 'username', 'firstName', 'lastName', 'avatar_url'] }]
    });
    if (!post) return ApiResponse.notFound(res, 'Post');

    return ApiResponse.success(res, {
      id: post.id, creator: post.User || null, caption: post.caption, imageUrls: post.image_urls || [],
      videoUrl: post.video_url || null, hashtags: post.hashtags || [], engagement: { likes: post.likes_count || 0, comments: post.comments_count || 0 },
      createdAt: post.created_at, updatedAt: post.updated_at
    }, 'Post retrieved');
  } catch (error) {
    console.error('❌ getPostById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await models.Post.findByPk(postId);
    if (!post) return ApiResponse.notFound(res, 'Post');

    const { caption, visibility } = req.body;
    if (caption !== undefined) post.caption = caption;
    if (visibility !== undefined) post.visibility = visibility;
    post.updated_at = new Date();
    await post.save();

    return ApiResponse.success(res, { id: post.id }, 'Post updated');
  } catch (error) {
    console.error('❌ updatePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await models.Post.findByPk(postId);
    if (!post) return ApiResponse.notFound(res, 'Post');

    post.deleted_at = new Date();
    await post.save();

    return ApiResponse.success(res, {}, 'Post deleted');
  } catch (error) {
    console.error('❌ deletePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get all reels
exports.getAllReels = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const validated_limit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * validated_limit;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    let whereClause = '1=1';
    if (search) whereClause = `r.video_url ILIKE $1`;

    const countQuery = `SELECT COUNT(*) as count FROM reels r WHERE ${whereClause}`;
    const countRes = search ? await client.query(countQuery, [`%${search}%`]) : await client.query(countQuery);
    const total = parseInt(countRes.rows[0]?.count || 0);

    const reelsQuery = `
      SELECT r.id, r.user_id, r.video_url, r.created_at, r.updated_at,
             COALESCE(u.first_name, '') as creator_firstname, COALESCE(u.last_name, '') as creator_lastname
      FROM reels r LEFT JOIN users u ON r.user_id = u.id
      WHERE ${whereClause} ORDER BY r.created_at DESC LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}
    `;
    const params = search ? [`%${search}%`, validated_limit, offset] : [validated_limit, offset];
    const reelsRes = await client.query(reelsQuery, params);
    await client.end();

    const data = reelsRes.rows.map(reel => {
      const creatorName = reel.creator_firstname || reel.creator_lastname ? `${reel.creator_firstname} ${reel.creator_lastname}`.trim() : null;
      return { id: reel.id, videoUrl: reel.video_url || null, creator: reel.user_id ? { id: reel.user_id, name: creatorName } : null, createdAt: reel.created_at };
    });

    return ApiResponse.paginated(res, data, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) },
      'Reels retrieved successfully');
  } catch (error) {
    console.error('❌ getAllReels error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get reel by ID
exports.getReelById = async (req, res) => {
  try {
    const { reelId } = req.params;
    const reel = await models.Reel.findByPk(reelId, {
      include: [{ model: models.User, attributes: ['id', 'username', 'firstName', 'lastName', 'avatar_url'] }]
    });
    if (!reel) return ApiResponse.notFound(res, 'Reel');

    return ApiResponse.success(res, {
      id: reel.id, creator: reel.User || null, title: reel.title || null, videoUrl: reel.video_url || null,
      duration: reel.duration || null, views: reel.views_count || 0, likes: reel.likes_count || 0,
      createdAt: reel.created_at, updatedAt: reel.updated_at
    }, 'Reel retrieved');
  } catch (error) {
    console.error('❌ getReelById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Update reel
exports.updateReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const reel = await models.Reel.findByPk(reelId);
    if (!reel) return ApiResponse.notFound(res, 'Reel');

    const { title } = req.body;
    if (title !== undefined) reel.title = title;
    reel.updated_at = new Date();
    await reel.save();

    return ApiResponse.success(res, { id: reel.id }, 'Reel updated');
  } catch (error) {
    console.error('❌ updateReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Delete reel
exports.deleteReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const reel = await models.Reel.findByPk(reelId);
    if (!reel) return ApiResponse.notFound(res, 'Reel');

    reel.deleted_at = new Date();
    await reel.save();

    return ApiResponse.success(res, {}, 'Reel deleted');
  } catch (error) {
    console.error('❌ deleteReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get moderation stats
exports.getModerationStats = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view moderation stats');
    }

    const total_reports = await models.ContentReport?.count() || 0;
    const pending_reports = await models.ContentReport?.count({ where: { status: 'pending' } }) || 0;
    const banned_users = await models.User.count({ where: { account_status: 'banned' } });

    return ApiResponse.success(res, {
      total_reports, pending_reports, banned_users, approved_reports: 0,
      reports_by_reason: [], reports_by_content_type: []
    }, 'Moderation statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getModerationStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get tagged products
exports.getTaggedProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const validated_limit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * validated_limit;

    const data = [];
    const pagination = { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 };

    return ApiResponse.paginated(res, data, pagination, 'Tagged products retrieved successfully');
  } catch (error) {
    console.error('❌ getTaggedProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get all hashtags
exports.getAllHashtags = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const validated_limit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * validated_limit;

    const data = [];
    const pagination = { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 };

    return ApiResponse.paginated(res, data, pagination, 'Hashtags retrieved successfully');
  } catch (error) {
    console.error('❌ getAllHashtags error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get all comments
exports.getAllComments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    const validated_limit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page) || 1) - 1) * validated_limit;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const params = [];
    let whereConditions = [];
    if (status && status !== 'all') { whereConditions.push(`COALESCE(pc.status, 'pending') = $${params.length + 1}`); params.push(status); }
    if (search) { whereConditions.push(`pc.text ILIKE $${params.length + 1}`); params.push(`%${search}%`); }

    const whereClause = whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as count FROM post_comments pc ${whereClause}`;
    const countRes = await client.query(countQuery, params.slice());
    const total = parseInt(countRes.rows[0]?.count || 0);

    const allParams = [...params, validated_limit, offset];
    const commentsQuery = `
      SELECT pc.id, pc.text, COALESCE(pc.status, 'pending') as status, pc.created_at,
             u.id as author_id, COALESCE(u.first_name, '') as author_firstname, COALESCE(u.last_name, '') as author_lastname,
             p.id as post_id
      FROM post_comments pc LEFT JOIN users u ON pc.user_id = u.id LEFT JOIN posts p ON pc.post_id = p.id
      ${whereClause} ORDER BY pc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const commentsRes = await client.query(commentsQuery, allParams);
    await client.end();

    const data = commentsRes.rows.map(comment => {
      const authorName = (comment.author_firstname || comment.author_lastname) ? `${comment.author_firstname} ${comment.author_lastname}`.trim() : 'Anonymous';
      return {
        id: comment.id, text: comment.text, status: comment.status,
        author: { id: comment.author_id, name: authorName },
        post: { id: comment.post_id, preview: '' },
        createdAt: comment.created_at
      };
    });

    return ApiResponse.paginated(res, data, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) },
      'Comments retrieved successfully');
  } catch (error) {
    console.error('❌ getAllComments error:', error);
    return ApiResponse.serverError(res, error);
  }
};


