/**
 * Auth Middleware - JWT Token Verification
 */

const auth = (req, res, next) => {
  // Middleware will be properly implemented per database
  // For now, just pass through
  next();
};

const optionalAuth = (req, res, next) => {
  // Optional auth - doesn't block if no token
  next();
};

module.exports = {
  auth,
  optionalAuth
};
