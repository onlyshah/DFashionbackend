const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const { auth, requireRole } = require('../middleware/auth');

// Use centralized role middleware for super admin

// @route   GET /api/modules
// @desc    Get all modules
// @access  Private/Super Admin
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { category } = req.query;
    
    const filter = { isActive: true };
    if (category) {
      filter.category = category;
    }

    const modules = await Module.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ category: 1, sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/modules
// @desc    Create new module
// @access  Private/Super Admin
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      category,
      icon,
      route,
      availableActions,
      requiredLevel,
      sortOrder
    } = req.body;

    // Check if module already exists
    const existingModule = await Module.findOne({ name: name.toLowerCase() });
    if (existingModule) {
      return res.status(400).json({
        success: false,
        message: 'Module with this name already exists'
      });
    }

    const module = new Module({
      name: name.toLowerCase(),
      displayName,
      description,
      category,
      icon,
      route,
      availableActions: availableActions || [
        { name: 'read', displayName: 'View', description: 'View module content' }
      ],
      requiredLevel: requiredLevel || 1,
      sortOrder: sortOrder || 0,
      createdBy: req.user.userId
    });

    await module.save();

    const populatedModule = await Module.findById(module._id)
      .populate('createdBy', 'username fullName');

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: populatedModule
    });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/modules/:id
// @desc    Update module
// @access  Private/Super Admin
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const {
      displayName,
      description,
      category,
      icon,
      route,
      availableActions,
      requiredLevel,
      sortOrder,
      isActive
    } = req.body;

    // Update module
    if (displayName) module.displayName = displayName;
    if (description) module.description = description;
    if (category) module.category = category;
    if (icon) module.icon = icon;
    if (route) module.route = route;
    if (availableActions) module.availableActions = availableActions;
    if (requiredLevel) module.requiredLevel = requiredLevel;
    if (typeof sortOrder === 'number') module.sortOrder = sortOrder;
    if (typeof isActive === 'boolean') module.isActive = isActive;

    await module.save();

    const populatedModule = await Module.findById(module._id)
      .populate('createdBy', 'username fullName');

    res.json({
      success: true,
      message: 'Module updated successfully',
      data: populatedModule
    });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/modules/:id
// @desc    Delete module
// @access  Private/Super Admin
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    await Module.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/modules/categories
// @desc    Get module categories
// @access  Private/Super Admin
router.get('/categories', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const categories = await Module.distinct('category');
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get module categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
