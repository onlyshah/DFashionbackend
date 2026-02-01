const ServiceLoader = require('../services/ServiceLoader');
const analyticsService = ServiceLoader.loadService('analyticsService');


const { sendResponse, sendError } = require('../utils/response');

class AnalyticsController {
  /**
   * Get user analytics dashboard
   * GET /
   */
  static async getDashboard(req, res) {
    try {
      const { period = 30 } = req.query;
      const analytics = await AnalyticsRepository.getDashboard(period);
      return sendResponse(res, {
        success: true,
        data: analytics,
        message: 'Analytics dashboard retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get traffic analytics
   * GET /traffic
   */
  static async getTrafficAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const traffic = await AnalyticsRepository.getTraffic(startDate, endDate);
      return sendResponse(res, {
        success: true,
        data: traffic,
        message: 'Traffic analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get conversion analytics
   * GET /conversion
   */
  static async getConversionAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const conversion = await AnalyticsRepository.getConversion(period);
      return sendResponse(res, {
        success: true,
        data: conversion,
        message: 'Conversion analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get revenue analytics
   * GET /revenue
   */
  static async getRevenueAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const revenue = await AnalyticsRepository.getRevenue(startDate, endDate);
      return sendResponse(res, {
        success: true,
        data: revenue,
        message: 'Revenue analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get product performance analytics
   * GET /products
   */
  static async getProductAnalytics(req, res) {
    try {
      const { limit = 10 } = req.query;
      const products = await AnalyticsRepository.getProductPerformance(limit);
      return sendResponse(res, {
        success: true,
        data: products,
        message: 'Product analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Track analytics event
   * POST /track
   */
  static async trackEvent(req, res) {
    try {
      const { eventType, eventData } = req.body;
      const userId = req.user?.id;
      const event = await AnalyticsRepository.trackEvent({
        userId,
        eventType,
        eventData,
        timestamp: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: event,
        message: 'Event tracked successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Track user behavior
   * POST /track
   */
  static async trackUserBehavior(req, res) {
    try {
      const { eventType, eventData } = req.body;
      const userId = req.user?.id;
      const event = await AnalyticsRepository.trackEvent({
        userId,
        eventType,
        eventData,
        timestamp: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: event,
        message: 'User behavior tracked successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get orders analytics
   * GET /orders
   */
  static async getOrdersAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const orders = await AnalyticsRepository.getOrdersAnalytics(period);
      return sendResponse(res, {
        success: true,
        data: orders,
        message: 'Orders analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get users analytics
   * GET /users
   */
  static async getUsersAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const users = await AnalyticsRepository.getUsersAnalytics(period);
      return sendResponse(res, {
        success: true,
        data: users,
        message: 'Users analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get categories analytics
   * GET /categories
   */
  static async getCategoriesAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const categories = await AnalyticsRepository.getCategoriesAnalytics(period);
      return sendResponse(res, {
        success: true,
        data: categories,
        message: 'Categories analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get sales analytics
   * GET /sales
   */
  static async getSalesAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const sales = await AnalyticsRepository.getSalesAnalytics(period);
      return sendResponse(res, {
        success: true,
        data: sales,
        message: 'Sales analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get products analytics
   * GET /products
   */
  static async getProductsAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const products = await AnalyticsRepository.getProductsAnalytics(period);
      return sendResponse(res, {
        success: true,
        data: products,
        message: 'Products analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get overview analytics
   * GET /overview
   */
  static async getOverview(req, res) {
    try {
      const { period = 30 } = req.query;
      const overview = await AnalyticsRepository.getOverview(period);
      return sendResponse(res, {
        success: true,
        data: overview,
        message: 'Analytics overview retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = AnalyticsController;
