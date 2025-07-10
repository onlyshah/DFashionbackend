const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Basic security middleware without external dependencies
class BasicSecurity {
  
  // Basic rate limiting (more permissive for development)
  static generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for OPTIONS requests (CORS preflight)
      return req.method === 'OPTIONS';
    }
  });

  static authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 auth requests per windowMs (increased for development)
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for OPTIONS requests (CORS preflight)
      return req.method === 'OPTIONS';
    }
  });

  // Basic security headers
  static securityHeaders = (req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add request ID for tracking
    req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    res.setHeader('X-Request-ID', req.requestId);
    
    next();
  };

  // Basic input sanitization
  static sanitizeInput = (req, res, next) => {
    // Basic sanitization for common injection patterns
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      // Remove dangerous patterns
      return str
        .replace(/[\$\{\}]/g, '') // Remove MongoDB operators
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    };

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj) => {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
              obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              sanitizeObject(obj[key]);
            }
          }
        }
      };
      sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      for (const key in req.query) {
        if (req.query.hasOwnProperty(key) && typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key]);
        }
      }
    }

    next();
  };

  // Basic request logging
  static requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };
      
      // Log to console (in production, use proper logging)
      if (res.statusCode >= 400) {
        console.warn('⚠️ HTTP Error:', logData);
      } else {
        console.log('📝 Request:', logData);
      }
    });
    
    next();
  };

  // Basic validation middleware
  static validateInput = (req, res, next) => {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /<script/i,
      /javascript:/i,
      /eval\(/i,
      /function\(/i
    ];

    const checkSuspicious = (obj, path = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string') {
            for (const pattern of suspiciousPatterns) {
              if (pattern.test(value)) {
                console.warn(`🚨 Suspicious input detected at ${currentPath}: ${value}`);
                return res.status(400).json({
                  success: false,
                  message: 'Invalid input detected'
                });
              }
            }
          } else if (typeof value === 'object' && value !== null) {
            const result = checkSuspicious(value, currentPath);
            if (result) return result;
          }
        }
      }
      return null;
    };

    // Check request body
    if (req.body && typeof req.body === 'object') {
      const result = checkSuspicious(req.body, 'body');
      if (result) return result;
    }

    // Check query parameters
    if (req.query && typeof req.query === 'object') {
      const result = checkSuspicious(req.query, 'query');
      if (result) return result;
    }

    next();
  };

  // CORS configuration
  static corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:4200',
        'http://localhost:8100',
        'http://127.0.0.1:4200',
        'http://127.0.0.1:8100',
        'capacitor://localhost',
        'ionic://localhost',
        'http://localhost'
      ];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization'
    ]
  };

  // Helmet configuration
  static helmet = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    crossOriginEmbedderPolicy: false
  });
}

module.exports = BasicSecurity;
