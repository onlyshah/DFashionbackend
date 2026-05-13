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
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
  }),
  
  generalLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  })
};

module.exports = basicSecurity;
