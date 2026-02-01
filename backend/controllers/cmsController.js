const ServiceLoader = require('../utils/serviceLoader');
const cmsService = ServiceLoader.getService('cms');


const { sendResponse, sendError } = require('../utils/response');

class CMSController {
  /**
   * Get all CMS pages
   * GET /
   */
  static async getAllPages(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const pages = await CMSRepository.findAll({ page, limit, status });
      return sendResponse(res, {
        success: true,
        data: pages,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(pages.total / limit),
          total: pages.total
        },
        message: 'Pages retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get CMS page by slug
   * GET /:slug
   */
  static async getPageBySlug(req, res) {
    try {
      const { slug } = req.params;
      const page = await CMSRepository.findBySlug(slug);
      if (!page) return sendError(res, 'Page not found', 404);
      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a new CMS page (admin)
   * POST /
   */
  static async createPage(req, res) {
    try {
      const { title, slug, content, description, status = 'draft' } = req.body;
      const page = await CMSRepository.create({
        title,
        slug,
        content,
        description,
        status,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a CMS page (admin)
   * PUT /:pageId
   */
  static async updatePage(req, res) {
    try {
      const { pageId } = req.params;
      const { title, slug, content, description, status } = req.body;
      const page = await CMSRepository.update(pageId, {
        title,
        slug,
        content,
        description,
        status
      });
      if (!page) return sendError(res, 'Page not found', 404);
      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a CMS page (admin)
   * DELETE /:pageId
   */
  static async deletePage(req, res) {
    try {
      const { pageId } = req.params;
      await CMSRepository.delete(pageId);
      return sendResponse(res, {
        success: true,
        message: 'Page deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Publish a CMS page (admin)
   * POST /:pageId/publish
   */
  static async publishPage(req, res) {
    try {
      const { pageId } = req.params;
      const page = await CMSRepository.update(pageId, { status: 'published' });
      if (!page) return sendError(res, 'Page not found', 404);
      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page published successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get SEO metadata for page
   * GET /:pageId/seo
   */
  static async getPageSEO(req, res) {
    try {
      const { pageId } = req.params;
      const seo = await CMSRepository.getSEO(pageId);
      return sendResponse(res, {
        success: true,
        data: seo,
        message: 'SEO metadata retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = CMSController;
