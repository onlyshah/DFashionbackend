const ServiceLoader = require('../utils/serviceLoader');
const logisticsService = ServiceLoader.getService('logistics');


const { sendResponse, sendError } = require('../utils/response');

class LogisticsController {
  /**
   * Track shipment
   * GET /track/:trackingId
   */
  static async trackShipment(req, res) {
    try {
      const { trackingId } = req.params;
      const shipment = await LogisticsRepository.getShipment(trackingId);
      if (!shipment) return sendError(res, 'Shipment not found', 404);
      return sendResponse(res, {
        success: true,
        data: shipment,
        message: 'Shipment tracked successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get shipping options
   * POST /shipping-options
   */
  static async getShippingOptions(req, res) {
    try {
      const { fromAddress, toAddress, weight, dimensions } = req.body;
      const options = await LogisticsRepository.getShippingOptions({
        fromAddress,
        toAddress,
        weight,
        dimensions
      });
      return sendResponse(res, {
        success: true,
        data: options,
        message: 'Shipping options retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create shipment
   * POST /shipments
   */
  static async createShipment(req, res) {
    try {
      const { orderId, carrier, shippingAddress } = req.body;
      // validate foreign keys
      const models = require('../models_sql');
      if (orderId) {
        const order = await models.Order.findByPk(orderId);
        if (!order) return sendError(res, 'Order not found', 404);
      }
      if (carrier) {
        const courier = await models.Courier.findByPk(carrier);
        if (!courier) return sendError(res, 'Courier not found', 404);
      }
      const shipment = await LogisticsRepository.create({
        orderId,
        carrier,
        shippingAddress,
        status: 'pending',
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: shipment,
        message: 'Shipment created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update shipment status
   * PUT /shipments/:shipmentId
   */
  static async updateShipment(req, res) {
    try {
      const { shipmentId } = req.params;
      const { status, tracking, carrier } = req.body;
      // validate carrier fk if provided
      if (carrier) {
        const models = require('../models_sql');
        const courier = await models.Courier.findByPk(carrier);
        if (!courier) return sendError(res, 'Courier not found', 404);
      }
      const shipment = await LogisticsRepository.update(shipmentId, { status, tracking, carrier });
      if (!shipment) return sendError(res, 'Shipment not found', 404);
      return sendResponse(res, {
        success: true,
        data: shipment,
        message: 'Shipment updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get warehouse inventory
   * GET /warehouses/:warehouseId/inventory
   */
  static async getWarehouseInventory(req, res) {
    try {
      const { warehouseId } = req.params;
      const inventory = await LogisticsRepository.getWarehouseInventory(warehouseId);
      return sendResponse(res, {
        success: true,
        data: inventory,
        message: 'Warehouse inventory retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get delivery routes
   * GET /routes
   */
  static async getDeliveryRoutes(req, res) {
    try {
      const { date } = req.query;
      const routes = await LogisticsRepository.getDeliveryRoutes(date);
      return sendResponse(res, {
        success: true,
        data: routes,
        message: 'Delivery routes retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get logistics analytics
   * GET /analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await LogisticsRepository.getAnalytics(startDate, endDate);
      return sendResponse(res, {
        success: true,
        data: analytics,
        message: 'Logistics analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = LogisticsController;
