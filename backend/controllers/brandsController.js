const ServiceLoader = require('../services/ServiceLoader');
const brandService = ServiceLoader.loadService('brandService');

const { sendResponse, sendError } = require('../utils/response');

class BrandsController {
  /**
   * Get all brands
   * GET /
   */
  static async getAllBrands(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const brands = await BrandRepository.findAll({ page, limit, search });
      return sendResponse(res, {
        success: true,
        data: brands,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(brands.total / limit),
          total: brands.total
        },
        message: 'Brands retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get brand by ID
   * GET /:brandId
   */
  static async getBrandById(req, res) {
    try {
      const { brandId } = req.params;
      const brand = await BrandRepository.findById(brandId);
      if (!brand) return sendError(res, 'Brand not found', 404);
      return sendResponse(res, {
        success: true,
        data: brand,
        message: 'Brand retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a new brand (admin)
   * POST /
   */
  static async createBrand(req, res) {
    try {
      const { name, description, logo, website } = req.body;
      const brand = await BrandRepository.create({
        name,
        description,
        logo,
        website,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: brand,
        message: 'Brand created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a brand (admin)
   * PUT /:brandId
   */
  static async updateBrand(req, res) {
    try {
      const { brandId } = req.params;
      const { name, description, logo, website } = req.body;
      const brand = await BrandRepository.update(brandId, {
        name,
        description,
        logo,
        website
      });
      if (!brand) return sendError(res, 'Brand not found', 404);
      return sendResponse(res, {
        success: true,
        data: brand,
        message: 'Brand updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a brand (admin)
   * DELETE /:brandId
   */
  static async deleteBrand(req, res) {
    try {
      const { brandId } = req.params;
      await BrandRepository.delete(brandId);
      return sendResponse(res, {
        success: true,
        message: 'Brand deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get popular brands
   * GET /popular
   */
  static async getPopularBrands(req, res) {
    try {
      const { limit = 10 } = req.query;
      const brands = await BrandRepository.getPopular(limit);
      return sendResponse(res, {
        success: true,
        data: brands,
        message: 'Popular brands retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get brand products
   * GET /:brandId/products
   */
  static async getBrandProducts(req, res) {
    try {
      const { brandId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const products = await BrandRepository.getProducts(brandId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: products,
        message: 'Brand products retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = BrandsController;
