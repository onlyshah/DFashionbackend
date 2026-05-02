const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_key_secret'
    });
  }

  /**
   * Create a Razorpay order
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} Razorpay order response
   */
  async createOrder(orderData) {
    try {
      const options = {
        amount: Math.round(orderData.amount * 100), // Convert to paise
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt || `receipt_${Date.now()}`,
        notes: orderData.notes || {}
      };

      const order = await this.razorpay.orders.create(options);
      return {
        success: true,
        data: order
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify payment signature
   * @param {Object} paymentData - Payment verification data
   * @returns {Boolean} Verification result
   */
  verifyPaymentSignature(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_key_secret')
        .update(body.toString())
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      console.error('Payment signature verification error:', error);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async fetchPayment(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Fetch payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Capture payment
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to capture in paise
   * @returns {Promise<Object>} Capture response
   */
  async capturePayment(paymentId, amount) {
    try {
      const payment = await this.razorpay.payments.capture(paymentId, amount);
      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Payment capture error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create refund
   * @param {String} paymentId - Razorpay payment ID
   * @param {Object} refundData - Refund details
   * @returns {Promise<Object>} Refund response
   */
  async createRefund(paymentId, refundData) {
    try {
      const options = {
        amount: Math.round(refundData.amount * 100), // Convert to paise
        notes: refundData.notes || {}
      };

      const refund = await this.razorpay.payments.refund(paymentId, options);
      return {
        success: true,
        data: refund
      };
    } catch (error) {
      console.error('Refund creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch refund details
   * @param {String} paymentId - Razorpay payment ID
   * @param {String} refundId - Razorpay refund ID
   * @returns {Promise<Object>} Refund details
   */
  async fetchRefund(paymentId, refundId) {
    try {
      const refund = await this.razorpay.payments.fetchRefund(paymentId, refundId);
      return {
        success: true,
        data: refund
      };
    } catch (error) {
      console.error('Fetch refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all refunds for a payment
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Refunds list
   */
  async getAllRefunds(paymentId) {
    try {
      const refunds = await this.razorpay.payments.fetchMultipleRefund(paymentId);
      return {
        success: true,
        data: refunds
      };
    } catch (error) {
      console.error('Fetch all refunds error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create transfer (for marketplace scenarios)
   * @param {Object} transferData - Transfer details
   * @returns {Promise<Object>} Transfer response
   */
  async createTransfer(transferData) {
    try {
      const options = {
        transfers: transferData.transfers.map(transfer => ({
          account: transfer.account,
          amount: Math.round(transfer.amount * 100), // Convert to paise
          currency: transfer.currency || 'INR',
          notes: transfer.notes || {}
        }))
      };

      const transfer = await this.razorpay.transfers.create(options);
      return {
        success: true,
        data: transfer
      };
    } catch (error) {
      console.error('Transfer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate webhook signature
   * @param {String} body - Webhook body
   * @param {String} signature - Webhook signature
   * @returns {Boolean} Validation result
   */
  validateWebhookSignature(body, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret')
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook signature validation error:', error);
      return false;
    }
  }

  /**
   * Generate payment link
   * @param {Object} linkData - Payment link details
   * @returns {Promise<Object>} Payment link response
   */
  async createPaymentLink(linkData) {
    try {
      const options = {
        amount: Math.round(linkData.amount * 100), // Convert to paise
        currency: linkData.currency || 'INR',
        accept_partial: linkData.accept_partial || false,
        first_min_partial_amount: linkData.first_min_partial_amount ? Math.round(linkData.first_min_partial_amount * 100) : undefined,
        expire_by: linkData.expire_by,
        reference_id: linkData.reference_id,
        description: linkData.description,
        customer: linkData.customer,
        notify: linkData.notify || { sms: true, email: true },
        reminder_enable: linkData.reminder_enable || true,
        notes: linkData.notes || {},
        callback_url: linkData.callback_url,
        callback_method: linkData.callback_method || 'get'
      };

      const paymentLink = await this.razorpay.paymentLink.create(options);
      return {
        success: true,
        data: paymentLink
      };
    } catch (error) {
      console.error('Payment link creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RazorpayService();

