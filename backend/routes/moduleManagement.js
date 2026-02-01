const express = require('express');
const router = express.Router();
const moduleManagementController = require('../controllers/moduleManagementController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole('super_admin'), moduleManagementController.getAllModules);
router.post('/', auth, requireRole('super_admin'), moduleManagementController.createModule);
router.get('/:moduleId', auth, requireRole('super_admin'), moduleManagementController.getModuleById);
router.put('/:moduleId', auth, requireRole('super_admin'), moduleManagementController.updateModule);
router.delete('/:moduleId', auth, requireRole('super_admin'), moduleManagementController.deleteModule);

module.exports = router;