const express = require('express');
const router = express.Router();
const roleManagementController = require('../controllers/roleManagementController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole('super_admin'), roleManagementController.getAllRoles);
router.post('/', auth, requireRole('super_admin'), roleManagementController.createRole);
router.get('/:roleId', auth, requireRole('super_admin'), roleManagementController.getRoleById);
router.put('/:roleId', auth, requireRole('super_admin'), roleManagementController.updateRole);
router.delete('/:roleId', auth, requireRole('super_admin'), roleManagementController.deleteRole);
router.post('/:roleId/assign-user', auth, requireRole('super_admin'), roleManagementController.assignRoleToUser);

module.exports = router;