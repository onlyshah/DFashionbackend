const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const crypto = require('crypto');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General API rate limiter
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

// Strict rate limiter for authentication endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later'
);

// File upload rate limiter
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // limit each IP to 10 uploads per hour
  'Too many file uploads, please try again later'
);

// Search rate limiter
const searchLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  30, // limit each IP to 30 searches per minute
  'Too many search requests, please slow down'
);

// CSRF Protection
const csrfTokens = new Map();

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.sessionID || req.ip;

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }

  const storedToken = csrfTokens.get(sessionId);
  if (!storedToken || storedToken !== token) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
};

// Generate CSRF token endpoint
const generateCSRFTokenEndpoint = (req, res) => {
  const token = generateCSRFToken();
  const sessionId = req.sessionID || req.ip;
  
  // Store token with expiration (1 hour)
  csrfTokens.set(sessionId, token);
  setTimeout(() => {
    csrfTokens.delete(sessionId);
  }, 60 * 60 * 1000);

  res.json({
    success: true,
    csrfToken: token
  });
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Add request ID for tracking
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Check for common injection patterns
  const checkForInjection = (value) => {
    if (typeof value !== 'string') return false;
    
    const patterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|\/\*|\*\/)/g
    ];
    
    return patterns.some(pattern => pattern.test(value));
  };

  const validateObject = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        if (checkForInjection(value)) {
          throw new Error(`Potentially dangerous content detected in ${currentPath}`);
        }
        
        // Limit string length
        if (value.length > 10000) {
          throw new Error(`Input too long in ${currentPath}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        validateObject(value, currentPath);
      }
    }
  };

  try {
    if (req.body && typeof req.body === 'object') {
      validateObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      validateObject(req.query);
    }
    
    next();
  } catch (error) {
    console.warn(`Input validation failed for ${req.ip}: ${error.message}`);
    res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip} - ID: ${req.requestId}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ID: ${req.requestId}`);
    
    // Log security events
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`Security event: ${res.statusCode} for ${req.ip} on ${req.path}`);
    }
  });
  
  next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files || [req.file];
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain'
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of files) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type ${file.mimetype} not allowed`
      });
    }

    // Check file size
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size too large (max 10MB)'
      });
    }

    // Check filename for dangerous patterns
    if (/[<>:"/\\|?*]/.test(file.originalname)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    // Check for double extensions
    const extensionCount = (file.originalname.match(/\./g) || []).length;
    if (extensionCount > 1) {
      return res.status(400).json({
        success: false,
        message: 'Multiple file extensions not allowed'
      });
    }
  }

  next();
};

// CORS configuration
const corsOptions = {
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
    'Authorization',
    'X-CSRF-Token',
    'X-Request-ID'
  ]
};

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  csrfProtection,
  generateCSRFTokenEndpoint,
  securityHeaders,
  validateInput,
  requestLogger,
  fileUploadSecurity,
  corsOptions,
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }),
  mongoSanitize: mongoSanitize(),
  xss: xss(),
  hpp: hpp()
};
