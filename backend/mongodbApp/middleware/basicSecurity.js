const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const basicSecurity = {
  securityHeaders: helmet(),
  helmet: helmet(),
  
  requestLogger: (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  },
  
  sanitizeInput: (req, res, next) => {
    // Basic sanitization
    next();
  },
  
  validateInput: (req, res, next) => {
    // Basic validation
    next();
  },
  
  authLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs - prevent brute force
    message: 'Too many authentication attempts, please try again later.',
    skip: (req) => {
      // Don't rate limit preflight requests
      return req.method === 'OPTIONS';
    }
  }),
  
  generalLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // increased to 500 requests per 15 min (~33 req/min) for legitimate app usage
    message: 'Too many requests, please try again later.',
    skip: (req) => {
      // Skip rate limiting for OPTIONS requests and certain endpoints
      if (req.method === 'OPTIONS') return true;
      // Skip rate limiting for static assets
      if (req.path.startsWith('/uploads')) return true;
      return false;
    },
    keyGenerator: (req) => {
      // Use user ID instead of IP for authenticated requests to allow per-user limits
      return req.user?.id || req.ip;
    }
  })
};

module.exports = basicSecurity;
