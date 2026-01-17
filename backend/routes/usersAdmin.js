const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminAuth');

// Import Postgres models
let User, AuditLog, Role, Department;
const getModels = () => {
  if (!User) {
    try {
      const models = require('../models_sql');
      User = models._raw.User;
      AuditLog = models._raw.AuditLog;
      Role = models._raw.Role;
      Department = models._raw.Department;
    } catch (err) {
      console.error('Failed to load Postgres models:', err.message);
    }
  }
};

// Middleware to check if models are loaded
const checkModels = (req, res, next) => {
  getModels();
  if (!User) {
    return res.status(503).json({ success: false, message: 'Database models not available' });
  }
  next();
};

// @route   GET /api/admin/users/customers
// @desc    Get all customer users (Postgres)
// @access  Admin
router.get('/customers', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where: { role: 'customer' },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true
    });

    res.json({
      success: true,
      data: {
        users: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching customers', error: error.message });
  }
});

// @route   GET /api/admin/users/vendors
// @desc    Get all vendor users (Postgres)
// @access  Admin
router.get('/vendors', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where: { role: 'vendor' },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true
    });

    res.json({
      success: true,
      data: {
        users: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching vendors' });
  }
});

// @route   GET /api/admin/users/creators
// @desc    Get all creator users (Postgres)
// @access  Admin
router.get('/creators', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where: { role: 'creator' },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true
    });

    const response = {
      success: true,
      data: {
        users: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    };
    console.log(`[Creators API] Found ${count} creators, returning ${rows?.length || 0} rows for page ${page}`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching creators:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching creators' });
  }
});

// @route   GET /api/admin/users/admins
// @desc    Get all admin users (Postgres)
// @access  Admin
router.get('/admins', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    // Get Op from sequelize
    const { Op } = require('sequelize');
    
    const { count, rows } = await User.findAndCountAll({
      where: {
        role: { [Op.in]: ['admin', 'super_admin', 'superadmin'] }
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true
    });

    res.json({
      success: true,
      data: {
        users: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching admins:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error fetching admins', error: error.message });
  }
});

// @route   GET /api/admin/activity-logs
// @desc    Get activity logs (Postgres)
// @access  Admin
router.get('/activity-logs', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true
    });

    res.json({
      success: true,
      data: {
        logs: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching activity logs' });
  }
});

// @route   GET /api/admin/roles
// @desc    Get all roles (Postgres)
// @access  Admin
router.get('/roles', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const { count, rows } = await Role.findAndCountAll({
      order: [['name', 'ASC']],
      limit,
      offset,
      raw: true
    });

    res.json({
      success: true,
      data: {
        roles: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching roles:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching roles' });
  }
});

// @route   GET /api/admin/departments
// @desc    Get all departments (Postgres)
// @access  Admin
router.get('/departments', verifyAdminToken, checkModels, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    if (!Department) {
      return res.json({
        success: true,
        data: {
          departments: [],
          pagination: { page, limit, total: 0, pages: 0 }
        }
      });
    }

    const { count, rows } = await Department.findAndCountAll({
      order: [['name', 'ASC']],
      limit,
      offset,
      raw: true
    });

    res.json({
      success: true,
      data: {
        departments: rows || [],
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching departments:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching departments' });
  }
});

// @route   PATCH /api/admin/users/:id
// @desc    Update user status (Postgres)
// @access  Admin
router.patch('/:id', verifyAdminToken, async (req, res) => {
  try {
    getModels();
    const { isActive } = req.body;
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ isActive });

    // Log the activity if AuditLog available
    if (AuditLog) {
      try {
        await AuditLog.create({
          userId: req.user?.id,
          action: 'UPDATE',
          module: 'users',
          description: `Updated user ${user.id}`,
          createdAt: new Date()
        });
      } catch (logErr) {
        console.warn('Could not log activity:', logErr.message);
      }
    }

    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user (Postgres)
// @access  Admin
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    getModels();
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = user.id;
    await user.destroy();

    // Log the activity if AuditLog available
    if (AuditLog) {
      try {
        await AuditLog.create({
          userId: req.user?.id,
          action: 'DELETE',
          module: 'users',
          description: `Deleted user ${userId}`,
          createdAt: new Date()
        });
      } catch (logErr) {
        console.warn('Could not log activity:', logErr.message);
      }
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

module.exports = router;
