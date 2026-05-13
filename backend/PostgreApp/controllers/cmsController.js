/**
 * CMS Controller - PostgreSQL/Sequelize Version
 * Handles CMS pages, banners, FAQs
 * Methods: 17
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

// ========== PAGE METHODS ==========

exports.getAllPages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.isPublished = status === 'published';
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await models.Page.findAndCountAll({ where, offset, limit: parseInt(limit), order: [['publishedAt', 'DESC']] });
    return ApiResponse.paginated(res, rows, page, limit, count, 'Pages retrieved');
  } catch (error) {
    console.error('❌ getAllPages error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await models.Page.findOne({ where: { slug } });
    return page ? ApiResponse.success(res, page, 'Page retrieved') : ApiResponse.notFound(res, 'Page');
  } catch (error) {
    console.error('❌ getPageBySlug error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.createPage = async (req, res) => {
  try {
    const { title, slug, content, metaTitle, metaDescription, isPublished } = req.body;
    const existing = await models.Page.findOne({ where: { slug } });
    if (existing) return ApiResponse.error(res, 'Slug already exists', 409);
    const page = await models.Page.create({ title, slug, content, metaTitle, metaDescription, isPublished, publishedAt: isPublished ? new Date() : null });
    return ApiResponse.created(res, page, 'Page created');
  } catch (error) {
    console.error('❌ createPage error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updatePage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const { title, slug, content, metaTitle, metaDescription, isPublished } = req.body;
    const page = await models.Page.findByPk(pageId);
    if (!page) return ApiResponse.notFound(res, 'Page');
    await page.update({ title, slug, content, metaTitle, metaDescription, isPublished });
    return ApiResponse.success(res, page, 'Page updated');
  } catch (error) {
    console.error('❌ updatePage error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deletePage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await models.Page.findByPk(pageId);
    if (!page) return ApiResponse.notFound(res, 'Page');
    await page.destroy();
    return ApiResponse.success(res, {}, 'Page deleted');
  } catch (error) {
    console.error('❌ deletePage error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.publishPage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await models.Page.findByPk(pageId);
    if (!page) return ApiResponse.notFound(res, 'Page');
    await page.update({ isPublished: true, publishedAt: new Date() });
    return ApiResponse.success(res, page, 'Page published');
  } catch (error) {
    console.error('❌ publishPage error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getPageSEO = async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await models.Page.findByPk(pageId, { attributes: ['metaTitle', 'metaDescription'] });
    return page ? ApiResponse.success(res, page, 'SEO data retrieved') : ApiResponse.notFound(res, 'Page');
  } catch (error) {
    console.error('❌ getPageSEO error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ========== BANNER METHODS ==========

exports.getAllBanners = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await models.Banner.findAndCountAll({ offset, limit: parseInt(limit), order: [['createdAt', 'DESC']] });
    return ApiResponse.paginated(res, rows, page, limit, count, 'Banners retrieved');
  } catch (error) {
    console.error('❌ getAllBanners error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await models.Banner.findByPk(id);
    return banner ? ApiResponse.success(res, banner, 'Banner retrieved') : ApiResponse.notFound(res, 'Banner');
  } catch (error) {
    console.error('❌ getBannerById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.createBanner = async (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, position } = req.body;
    const banner = await models.Banner.create({ title, description, imageUrl, linkUrl, position });
    return ApiResponse.created(res, banner, 'Banner created');
  } catch (error) {
    console.error('❌ createBanner error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, linkUrl, position } = req.body;
    const banner = await models.Banner.findByPk(id);
    if (!banner) return ApiResponse.notFound(res, 'Banner');
    await banner.update({ title, description, imageUrl, linkUrl, position });
    return ApiResponse.success(res, banner, 'Banner updated');
  } catch (error) {
    console.error('❌ updateBanner error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await models.Banner.findByPk(id);
    if (!banner) return ApiResponse.notFound(res, 'Banner');
    await banner.destroy();
    return ApiResponse.success(res, {}, 'Banner deleted');
  } catch (error) {
    console.error('❌ deleteBanner error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ========== FAQ METHODS ==========

exports.getAllFAQs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await models.FAQ.findAndCountAll({ offset, limit: parseInt(limit), order: [['createdAt', 'DESC']] });
    return ApiResponse.paginated(res, rows, page, limit, count, 'FAQs retrieved');
  } catch (error) {
    console.error('❌ getAllFAQs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getFAQById = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await models.FAQ.findByPk(id);
    return faq ? ApiResponse.success(res, faq, 'FAQ retrieved') : ApiResponse.notFound(res, 'FAQ');
  } catch (error) {
    console.error('❌ getFAQById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    const faq = await models.FAQ.create({ question, answer, category });
    return ApiResponse.created(res, faq, 'FAQ created');
  } catch (error) {
    console.error('❌ createFAQ error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category } = req.body;
    const faq = await models.FAQ.findByPk(id);
    if (!faq) return ApiResponse.notFound(res, 'FAQ');
    await faq.update({ question, answer, category });
    return ApiResponse.success(res, faq, 'FAQ updated');
  } catch (error) {
    console.error('❌ updateFAQ error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await models.FAQ.findByPk(id);
    if (!faq) return ApiResponse.notFound(res, 'FAQ');
    await faq.destroy();
    return ApiResponse.success(res, {}, 'FAQ deleted');
  } catch (error) {
    console.error('❌ deleteFAQ error:', error);
    return ApiResponse.serverError(res, error);
  }
};


