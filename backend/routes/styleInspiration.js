const express = require('express');
const router = express.Router();
const styleInspirationController = require('../controllers/styleInspirationController');
const { auth, requireRole } = require('../middleware/auth');

// GET all inspirations
router.get('/', styleInspirationController.getAllInspirations);

// GET single inspiration
router.get('/:id', styleInspirationController.getInspirationById);

// CREATE inspiration
router.post('/', auth, styleInspirationController.createInspiration);

// UPDATE inspiration
router.put('/:id', auth, styleInspirationController.updateInspiration);

// DELETE inspiration
router.delete('/:id', auth, styleInspirationController.deleteInspiration);

module.exports = router;