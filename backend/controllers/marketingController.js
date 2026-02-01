const ServiceLoader = require('../utils/serviceLoader');
const marketingService = ServiceLoader.getService('marketing');


const { sendResponse, sendError } = require('../utils/response');

class MarketingController {
  /**
   * Get flash sales
   * GET /flash-sales
   */
  static async getFlashSales(req, res) {
    try {
      const { page = 1, limit = 20, status = 'active' } = req.query;
      const sales = await MarketingRepository.getFlashSales({ page, limit, status });
      return sendResponse(res, {
        success: true,
        data: sales,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(sales.total / limit),
          total: sales.total
        },
        message: 'Flash sales retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get flash sale by ID
   * GET /flash-sales/:saleId
   */
  static async getFlashSaleById(req, res) {
    try {
      const { saleId } = req.params;
      const sale = await MarketingRepository.getFlashSaleById(saleId);
      if (!sale) return sendError(res, 'Flash sale not found', 404);
      return sendResponse(res, {
        success: true,
        data: sale,
        message: 'Flash sale retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create flash sale (admin)
   * POST /flash-sales
   */
  static async createFlashSale(req, res) {
    try {
      const { title, products, discount, startTime, endTime } = req.body;
      const sale = await MarketingRepository.createFlashSale({
        title,
        products,
        discount,
        startTime,
        endTime,
        status: 'active'
      });
      return sendResponse(res, {
        success: true,
        data: sale,
        message: 'Flash sale created'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update flash sale (admin)
   * PUT /flash-sales/:saleId
   */
  static async updateFlashSale(req, res) {
    try {
      const { saleId } = req.params;
      const updates = req.body;
      const sale = await MarketingRepository.updateFlashSale(saleId, updates);
      if (!sale) return sendError(res, 'Flash sale not found', 404);
      return sendResponse(res, {
        success: true,
        data: sale,
        message: 'Flash sale updated'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete flash sale (admin)
   * DELETE /flash-sales/:saleId
   */
  static async deleteFlashSale(req, res) {
    try {
      const { saleId } = req.params;
      await MarketingRepository.deleteFlashSale(saleId);
      return sendResponse(res, {
        success: true,
        message: 'Flash sale deleted'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get campaigns
   * GET /campaigns
   */
  static async getCampaigns(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const campaigns = await MarketingRepository.getCampaigns({ page, limit });
      return sendResponse(res, {
        success: true,
        data: campaigns,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(campaigns.total / limit),
          total: campaigns.total
        },
        message: 'Campaigns retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create campaign (admin)
   * POST /campaigns
   */
  static async createCampaign(req, res) {
    try {
      const { name, description, startDate, endDate, budget } = req.body;
      const campaign = await MarketingRepository.createCampaign({
        name,
        description,
        startDate,
        endDate,
        budget,
        status: 'active'
      });
      return sendResponse(res, {
        success: true,
        data: campaign,
        message: 'Campaign created'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get campaign by ID
   * GET /campaigns/:campaignId
   */
  static async getCampaignById(req, res) {
    try {
      const { campaignId } = req.params;
      const campaign = await MarketingRepository.getCampaignById(campaignId);
      if (!campaign) return sendError(res, 'Campaign not found', 404);
      return sendResponse(res, {
        success: true,
        data: campaign,
        message: 'Campaign retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update campaign (admin)
   * PUT /campaigns/:campaignId
   */
  static async updateCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const updates = req.body;
      const campaign = await MarketingRepository.updateCampaign(campaignId, updates);
      if (!campaign) return sendError(res, 'Campaign not found', 404);
      return sendResponse(res, {
        success: true,
        data: campaign,
        message: 'Campaign updated'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete campaign (admin)
   * DELETE /campaigns/:campaignId
   */
  static async deleteCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      await MarketingRepository.deleteCampaign(campaignId);
      return sendResponse(res, {
        success: true,
        message: 'Campaign deleted'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get campaign metrics
   * GET /campaigns/:campaignId/metrics
   */
  static async getCampaignMetrics(req, res) {
    try {
      const { campaignId } = req.params;
      const metrics = await MarketingRepository.getCampaignMetrics(campaignId);
      return sendResponse(res, {
        success: true,
        data: metrics,
        message: 'Campaign metrics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get banners
   * GET /banners
   */
  static async getBanners(req, res) {
    try {
      const { limit = 10 } = req.query;
      const banners = await MarketingRepository.getBanners(limit);
      return sendResponse(res, {
        success: true,
        data: banners,
        message: 'Banners retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create banner (admin)
   * POST /banners
   */
  static async createBanner(req, res) {
    try {
      const { title, image, link, status = 'active' } = req.body;
      const banner = await MarketingRepository.createBanner({
        title,
        image,
        link,
        status
      });
      return sendResponse(res, {
        success: true,
        data: banner,
        message: 'Banner created'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get coupons (admin)
   * GET /coupons
   */
  static async getCoupons(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const coupons = await MarketingRepository.getCoupons({ page, limit });
      return sendResponse(res, {
        success: true,
        data: coupons,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(coupons.total / limit),
          total: coupons.total
        },
        message: 'Coupons retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create coupon (admin)
   * POST /coupons
   */
  static async createCoupon(req, res) {
    try {
      const { code, discount, maxUses, expiryDate } = req.body;
      const coupon = await MarketingRepository.createCoupon({
        code,
        discount,
        maxUses,
        expiryDate,
        status: 'active'
      });
      return sendResponse(res, {
        success: true,
        data: coupon,
        message: 'Coupon created'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Validate coupon
   * POST /coupons/validate
   */
  static async validateCoupon(req, res) {
    try {
      const { code, cartTotal } = req.body;
      const coupon = await MarketingRepository.validateCoupon(code, cartTotal);
      if (!coupon) return sendError(res, 'Invalid coupon code', 400);
      return sendResponse(res, {
        success: true,
        data: coupon,
        message: 'Coupon is valid'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Send push notification (admin)
   * POST /push-notification
   */
  static async sendPushNotification(req, res) {
    try {
      const { title, message, targetAudience } = req.body;
      const result = await MarketingRepository.sendPushNotification({
        title,
        message,
        targetAudience,
        sentAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Push notification sent'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Send email (admin)
   * POST /email
   */
  static async sendEmail(req, res) {
    try {
      const { to, subject, body } = req.body;
      const result = await MarketingRepository.sendEmail({ to, subject, body });
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Email sent successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Send SMS (admin)
   * POST /sms
   */
  static async sendSMS(req, res) {
    try {
      const { phone, message } = req.body;
      const result = await MarketingRepository.sendSMS({ phone, message });
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'SMS sent successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = MarketingController;
