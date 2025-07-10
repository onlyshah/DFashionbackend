const validator = require('validator');
const xss = require('xss');
const { body, query, param, validationResult } = require('express-validator');

class ValidationService {
  
  /**
   * Sanitize string input
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/script/gi, '') // Remove script keyword
      .replace(/['"`;\\]/g, '') // Remove SQL injection characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(input) {
    if (typeof input !== 'string') return input;
    
    const options = {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        ol: [],
        ul: [],
        li: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    };
    
    return xss(input, options);
  }

  /**
   * Validate email
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { isValid: false, message: 'Email is required' };
    }

    if (!validator.isEmail(email)) {
      return { isValid: false, message: 'Invalid email format' };
    }

    if (email.length > 254) {
      return { isValid: false, message: 'Email too long' };
    }

    return { isValid: true };
  }

  /**
   * Validate password
   */
  static validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { isValid: false, message: 'Password too long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, message: 'Password must contain lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, message: 'Password must contain uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Password must contain number' };
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return { isValid: false, message: 'Password must contain special character' };
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      return { isValid: false, message: 'Password too common' };
    }

    return { isValid: true };
  }

  /**
   * Validate username
   */
  static validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, message: 'Username is required' };
    }

    if (username.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters' };
    }

    if (username.length > 30) {
      return { isValid: false, message: 'Username too long' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    if (/^\d/.test(username)) {
      return { isValid: false, message: 'Username cannot start with a number' };
    }

    const reservedUsernames = ['admin', 'root', 'user', 'test', 'guest', 'api', 'www'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return { isValid: false, message: 'Username is reserved' };
    }

    return { isValid: true };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, message: 'Phone number is required' };
    }

    const phoneDigits = phone.replace(/\D/g, '');
    
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return { isValid: false, message: 'Invalid phone number length' };
    }

    return { isValid: true };
  }

  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(id) {
    if (!id || typeof id !== 'string') {
      return { isValid: false, message: 'ID is required' };
    }

    if (!validator.isMongoId(id)) {
      return { isValid: false, message: 'Invalid ID format' };
    }

    return { isValid: true };
  }

  /**
   * Validate URL
   */
  static validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { isValid: false, message: 'URL is required' };
    }

    if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
      return { isValid: false, message: 'Invalid URL format' };
    }

    // Prevent localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname.startsWith('127.') || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return { isValid: false, message: 'Private URLs not allowed' };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate price
   */
  static validatePrice(price) {
    if (price === undefined || price === null) {
      return { isValid: false, message: 'Price is required' };
    }

    const numPrice = parseFloat(price);
    
    if (isNaN(numPrice)) {
      return { isValid: false, message: 'Price must be a number' };
    }

    if (numPrice < 0) {
      return { isValid: false, message: 'Price cannot be negative' };
    }

    if (numPrice > 1000000) {
      return { isValid: false, message: 'Price too high' };
    }

    return { isValid: true, value: numPrice };
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity) {
    if (quantity === undefined || quantity === null) {
      return { isValid: false, message: 'Quantity is required' };
    }

    const numQuantity = parseInt(quantity);
    
    if (isNaN(numQuantity)) {
      return { isValid: false, message: 'Quantity must be a number' };
    }

    if (numQuantity < 1) {
      return { isValid: false, message: 'Quantity must be at least 1' };
    }

    if (numQuantity > 1000) {
      return { isValid: false, message: 'Quantity too high' };
    }

    return { isValid: true, value: numQuantity };
  }

  /**
   * Express validator middleware for user registration
   */
  static userRegistrationValidation() {
    return [
      body('email')
        .isEmail()
        .withMessage('Invalid email format')
        .isLength({ max: 254 })
        .withMessage('Email too long')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be 8-128 characters')
        .matches(/(?=.*[a-z])/)
        .withMessage('Password must contain lowercase letter')
        .matches(/(?=.*[A-Z])/)
        .withMessage('Password must contain uppercase letter')
        .matches(/(?=.*\d)/)
        .withMessage('Password must contain number')
        .matches(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
        .withMessage('Password must contain special character'),
      
      body('fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be 2-100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full name can only contain letters and spaces'),
      
      body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be 3-30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .not()
        .matches(/^\d/)
        .withMessage('Username cannot start with a number'),
      
      body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Invalid phone number')
    ];
  }

  /**
   * Express validator middleware for user login
   */
  static userLoginValidation() {
    return [
      body('email')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required')
    ];
  }

  /**
   * Express validator middleware for product creation
   */
  static productValidation() {
    return [
      body('name')
        .isLength({ min: 2, max: 200 })
        .withMessage('Product name must be 2-200 characters')
        .custom(value => {
          return !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value);
        })
        .withMessage('Invalid characters in product name'),
      
      body('description')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be 10-2000 characters'),
      
      body('price')
        .isFloat({ min: 0, max: 1000000 })
        .withMessage('Price must be between 0 and 1,000,000'),
      
      body('category')
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be 2-50 characters'),
      
      body('brand')
        .isLength({ min: 2, max: 50 })
        .withMessage('Brand must be 2-50 characters'),
      
      body('stock')
        .isInt({ min: 0, max: 10000 })
        .withMessage('Stock must be between 0 and 10,000')
    ];
  }

  /**
   * Express validator middleware for search queries
   */
  static searchValidation() {
    return [
      query('q')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be 1-100 characters')
        .custom(value => {
          // Check for SQL injection patterns
          const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
            /(--|\/\*|\*\/)/g
          ];
          return !sqlPatterns.some(pattern => pattern.test(value));
        })
        .withMessage('Invalid search query'),
      
      query('category')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Category too long'),
      
      query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be positive'),
      
      query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be positive'),
      
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be between 1 and 1000'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ];
  }

  /**
   * Handle validation errors
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }));

      console.warn(`Validation failed for ${req.ip}: ${JSON.stringify(errorMessages)}`);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }
    
    next();
  }

  /**
   * Sanitize request body
   */
  static sanitizeRequestBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query);
    }
    
    next();
  }

  /**
   * Recursively sanitize object
   */
  static sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

module.exports = ValidationService;
