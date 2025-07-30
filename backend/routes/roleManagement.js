const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Module = require('../models/Module');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin only.'
    });
  }
  next();
};

// @route   GET /api/roles
// @desc    Get all roles
// @access  Private/Super Admin
router.get('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('modulePermissions.module', 'name displayName category')
      .populate('createdBy', 'username fullName')
      .sort({ level: 1, name: 1 });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/roles
// @desc    Create new role
// @access  Private/Super Admin
router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      department,
      level,
      modulePermissions
    } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Validate module permissions
    if (modulePermissions && modulePermissions.length > 0) {
      const moduleIds = modulePermissions.map(mp => mp.module);
      const validModules = await Module.find({ _id: { $in: moduleIds } });
      
      if (validModules.length !== moduleIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more invalid module IDs provided'
        });
      }
    }

    const role = new Role({
      name: name.toLowerCase(),
      displayName,
      description,
      department,
      level,
      modulePermissions: modulePermissions || [],
      createdBy: req.user.userId
    });

    await role.save();

    const populatedRole = await Role.findById(role._id)
      .populate('modulePermissions.module', 'name displayName category')
      .populate('createdBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: populatedRole
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/roles/:id
// @desc    Update role
// @access  Private/Super Admin
router.put('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent modification of system roles
    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: 'System roles cannot be modified'
      });
    }

    const {
      displayName,
      description,
      department,
      level,
      modulePermissions,
      isActive
    } = req.body;

    // Validate module permissions if provided
    if (modulePermissions && modulePermissions.length > 0) {
      const moduleIds = modulePermissions.map(mp => mp.module);
      const validModules = await Module.find({ _id: { $in: moduleIds } });
      
      if (validModules.length !== moduleIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more invalid module IDs provided'
        });
      }
    }

    // Update role
    if (displayName) role.displayName = displayName;
    if (description) role.description = description;
    if (department) role.department = department;
    if (level) role.level = level;
    if (modulePermissions) role.modulePermissions = modulePermissions;
    if (typeof isActive === 'boolean') role.isActive = isActive;

    await role.save();

    const populatedRole = await Role.findById(role._id)
      .populate('modulePermissions.module', 'name displayName category')
      .populate('createdBy', 'username fullName');

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: populatedRole
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/roles/:id
// @desc    Delete role
// @access  Private/Super Admin
router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: 'System roles cannot be deleted'
      });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${usersWithRole} users are assigned to this role.`
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/roles/:id/permissions
// @desc    Get role permissions
// @access  Private/Super Admin
router.get('/:id/permissions', auth, requireSuperAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('modulePermissions.module', 'name displayName category availableActions');
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.json({
      success: true,
      data: {
        role: role.name,
        permissions: role.getAllPermissions()
      }
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
