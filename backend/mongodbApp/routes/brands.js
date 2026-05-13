const express = require('express');
const router = express.Router();
const brandsController = require('../controllers/brandsController');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/', brandsController.getAllBrands);
router.get('/:brandId', brandsController.getBrandById);
router.post('/', auth, brandsController.createBrand);
router.put('/:brandId', auth, brandsController.updateBrand);
router.delete('/:brandId', auth, brandsController.deleteBrand);

module.exports = router;