const ServiceLoader = require('../utils/serviceLoader');
const cmsService = ServiceLoader.getService('cms');
const models = require('../models_sql');

const { sendResponse, sendError } = require('../utils/response');

class CMSController {
  /**
   * Get all CMS pages
   * GET /
   */
  static async getAllPages(req, res) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Ensure models are initialized
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      // Build filter
      const where = {};
      if (status !== undefined) {
        where.isPublished = status === 'published' ? true : false;
      }
      if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), Op.like, `%${search.toLowerCase()}%`),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('slug')), Op.like, `%${search.toLowerCase()}%`)
        ];
      }

      // Get total count and pages
      const { count: total, rows: pages } = await Page.findAndCountAll({
        where,
        offset,
        limit: limitNum,
        order: [['publishedAt', 'DESC']],
        attributes: { exclude: ['content'] } // Exclude large content field in list view
      });

      return sendResponse(res, {
        success: true,
        data: { pages, total },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        message: 'Pages retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching pages:', error);
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
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      const page = await Page.findOne({ where: { slug } });
      if (!page) return sendError(res, 'Page not found', 404);

      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching page by slug:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a new CMS page (admin)
   * POST /
   */
  static async createPage(req, res) {
    try {
      const { title, slug, content, metaTitle, metaDescription, isPublished = true } = req.body;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      // Check if slug already exists
      const existing = await Page.findOne({ where: { slug } });
      if (existing) {
        return sendError(res, 'Page with this slug already exists', 400);
      }

      const page = await Page.create({
        title,
        slug,
        content,
        metaTitle,
        metaDescription,
        isPublished,
        publishedAt: isPublished ? new Date() : null
      });

      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page created successfully'
      }, 201);
    } catch (error) {
      console.error('Error creating page:', error);
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
      const { title, slug, content, metaTitle, metaDescription, isPublished } = req.body;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      // Check if slug is being changed and already exists
      if (slug) {
        const { Op } = require('sequelize');
        const existing = await Page.findOne({
          where: {
            slug,
            id: { [Op.ne]: pageId }
          }
        });
        if (existing) {
          return sendError(res, 'Page with this slug already exists', 400);
        }
      }

      const updateData = {
        title,
        slug,
        content,
        metaTitle,
        metaDescription,
        isPublished
      };

      if (isPublished === true) {
        updateData.publishedAt = new Date();
      }

      const page = await Page.findByPk(pageId);
      if (!page) return sendError(res, 'Page not found', 404);

      await page.update(updateData);

      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page updated successfully'
      });
    } catch (error) {
      console.error('Error updating page:', error);
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
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      const page = await Page.findByPk(pageId);
      if (!page) return sendError(res, 'Page not found', 404);

      await page.destroy();

      return sendResponse(res, {
        success: true,
        message: 'Page deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting page:', error);
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
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      const page = await Page.findByPk(pageId);
      if (!page) return sendError(res, 'Page not found', 404);

      await page.update({ isPublished: true, publishedAt: new Date() });

      return sendResponse(res, {
        success: true,
        data: page,
        message: 'Page published successfully'
      });
    } catch (error) {
      console.error('Error publishing page:', error);
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
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Page = models._raw?.Page || models.Page;
      if (!Page) throw new Error('Page model not available');

      const page = await Page.findByPk(pageId, {
        attributes: ['metaTitle', 'metaDescription']
      });
      if (!page) return sendError(res, 'Page not found', 404);

      return sendResponse(res, {
        success: true,
        data: {
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription
        },
        message: 'SEO metadata retrieved'
      });
    } catch (error) {
      console.error('Error fetching page SEO:', error);
      return sendError(res, error.message, 500);
    }
  }

  // ============= BANNER METHODS =============

  static async getAllBanners(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;

      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Banner = models._raw?.Banner || models.Banner;
      if (!Banner) throw new Error('Banner model not available');

      const { count: total, rows: banners } = await Banner.findAndCountAll({
        offset,
        limit: limitNum,
        order: [['createdAt', 'DESC']]
      });

      return sendResponse(res, {
        success: true,
        data: { banners, total },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        message: 'Banners retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching banners:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async getBannerById(req, res) {
    try {
      const { id } = req.params;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Banner = models._raw?.Banner || models.Banner;
      if (!Banner) throw new Error('Banner model not available');

      const banner = await Banner.findByPk(id);
      if (!banner) return sendError(res, 'Banner not found', 404);

      return sendResponse(res, {
        success: true,
        data: banner,
        message: 'Banner retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching banner:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async createBanner(req, res) {
    try {
      const { title, description, imageUrl, linkUrl, position } = req.body;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Banner = models._raw?.Banner || models.Banner;
      if (!Banner) throw new Error('Banner model not available');

      const banner = await Banner.create({
        title,
        description,
        imageUrl,
        linkUrl,
        position
      });

      return sendResponse(res, {
        success: true,
        data: banner,
        message: 'Banner created successfully'
      }, 201);
    } catch (error) {
      console.error('Error creating banner:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async updateBanner(req, res) {
    try {
      const { id } = req.params;
      const { title, description, imageUrl, linkUrl, position } = req.body;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Banner = models._raw?.Banner || models.Banner;
      if (!Banner) throw new Error('Banner model not available');

      const banner = await Banner.findByPk(id);
      if (!banner) return sendError(res, 'Banner not found', 404);

      await banner.update({
        title,
        description,
        imageUrl,
        linkUrl,
        position
      });

      return sendResponse(res, {
        success: true,
        data: banner,
        message: 'Banner updated successfully'
      });
    } catch (error) {
      console.error('Error updating banner:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async deleteBanner(req, res) {
    try {
      const { id } = req.params;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const Banner = models._raw?.Banner || models.Banner;
      if (!Banner) throw new Error('Banner model not available');

      const banner = await Banner.findByPk(id);
      if (!banner) return sendError(res, 'Banner not found', 404);

      await banner.destroy();

      return sendResponse(res, {
        success: true,
        message: 'Banner deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting banner:', error);
      return sendError(res, error.message, 500);
    }
  }

  // ============= FAQ METHODS =============

  static async getAllFAQs(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;

      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const FAQ = models._raw?.FAQ || models.FAQ;
      if (!FAQ) throw new Error('FAQ model not available');

      const { count: total, rows: faqs } = await FAQ.findAndCountAll({
        offset,
        limit: limitNum,
        order: [['createdAt', 'DESC']]
      });

      return sendResponse(res, {
        success: true,
        data: { faqs, total },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        message: 'FAQs retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async getFAQById(req, res) {
    try {
      const { id } = req.params;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const FAQ = models._raw?.FAQ || models.FAQ;
      if (!FAQ) throw new Error('FAQ model not available');

      const faq = await FAQ.findByPk(id);
      if (!faq) return sendError(res, 'FAQ not found', 404);

      return sendResponse(res, {
        success: true,
        data: faq,
        message: 'FAQ retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async createFAQ(req, res) {
    try {
      const { question, answer, category } = req.body;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const FAQ = models._raw?.FAQ || models.FAQ;
      if (!FAQ) throw new Error('FAQ model not available');

      const faq = await FAQ.create({
        question,
        answer,
        category
      });

      return sendResponse(res, {
        success: true,
        data: faq,
        message: 'FAQ created successfully'
      }, 201);
    } catch (error) {
      console.error('Error creating FAQ:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async updateFAQ(req, res) {
    try {
      const { id } = req.params;
      const { question, answer, category } = req.body;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const FAQ = models._raw?.FAQ || models.FAQ;
      if (!FAQ) throw new Error('FAQ model not available');

      const faq = await FAQ.findByPk(id);
      if (!faq) return sendError(res, 'FAQ not found', 404);

      await faq.update({
        question,
        answer,
        category
      });

      return sendResponse(res, {
        success: true,
        data: faq,
        message: 'FAQ updated successfully'
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      return sendError(res, error.message, 500);
    }
  }

  static async deleteFAQ(req, res) {
    try {
      const { id } = req.params;
      const models = require('../models_sql');
      const sequelize = models.sequelize || await models.getSequelizeInstance();
      if (!sequelize) throw new Error('Database not connected');

      const FAQ = models._raw?.FAQ || models.FAQ;
      if (!FAQ) throw new Error('FAQ model not available');

      const faq = await FAQ.findByPk(id);
      if (!faq) return sendError(res, 'FAQ not found', 404);

      await faq.destroy();

      return sendResponse(res, {
        success: true,
        message: 'FAQ deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = CMSController;
