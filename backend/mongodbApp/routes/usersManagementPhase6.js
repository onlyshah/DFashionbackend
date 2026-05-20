/**
 * Users Management Routes - Phase 6
 * 8 endpoints for admin user management
 */

const express = require('express');
const router = express.Router();
const usersManagementController = require('../controllers/usersManagementControllerPhase6');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Verify admin access
const adminOnly = [verifyToken, verifyRole(['admin', 'super_admin'])];

// Get all users
router.get('/', adminOnly, usersManagementController.getAllUsers);

// Get user details
router.get('/:userId', adminOnly, usersManagementController.getUserDetails);

// Get user activity
router.get('/:userId/activity', adminOnly, usersManagementController.getUserActivity);

// Update user role
router.put('/:userId/role', adminOnly, usersManagementController.updateUserRole);

// Block user
router.post('/:userId/block', adminOnly, usersManagementController.blockUser);

// Unblock user
router.delete('/:userId/block', adminOnly, usersManagementController.unblockUser);

// Verify user
router.post('/:userId/verify', adminOnly, usersManagementController.verifyUser);

// Delete user
router.delete('/:userId', adminOnly, usersManagementController.deleteUser);

module.exports = router;
