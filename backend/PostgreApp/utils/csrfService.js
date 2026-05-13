const crypto = require('crypto');

class CSRFService {
  constructor() {
    this.tokens = new Map();
    this.TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
    this.cleanup();
  }

  /**
   * Generate a secure CSRF token
   */
  generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.TOKEN_EXPIRY;
    
    this.tokens.set(sessionId, {
      token,
      expiresAt,
      createdAt: Date.now()
    });

    console.log(`CSRF token generated for session: ${sessionId}`);
    return token;
  }

  /**
   * Validate CSRF token
   */
  validateToken(sessionId, providedToken) {
    const tokenData = this.tokens.get(sessionId);
    
    if (!tokenData) {
      console.warn(`CSRF validation failed: No token found for session ${sessionId}`);
      return false;
    }

    if (Date.now() > tokenData.expiresAt) {
      console.warn(`CSRF validation failed: Token expired for session ${sessionId}`);
      this.tokens.delete(sessionId);
      return false;
    }

    if (tokenData.token !== providedToken) {
      console.warn(`CSRF validation failed: Token mismatch for session ${sessionId}`);
      return false;
    }

    console.log(`CSRF token validated successfully for session: ${sessionId}`);
    return true;
  }

  /**
   * Refresh token (generate new one and invalidate old)
   */
  refreshToken(sessionId) {
    this.tokens.delete(sessionId);
    return this.generateToken(sessionId);
  }

  /**
   * Remove token for session
   */
  removeToken(sessionId) {
    this.tokens.delete(sessionId);
    console.log(`CSRF token removed for session: ${sessionId}`);
  }

  /**
   * Get token for session
   */
  getToken(sessionId) {
    const tokenData = this.tokens.get(sessionId);
    
    if (!tokenData) {
      return null;
    }

    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(sessionId);
      return null;
    }

    return tokenData.token;
  }

  /**
   * Check if token exists and is valid
   */
  hasValidToken(sessionId) {
    const tokenData = this.tokens.get(sessionId);
    
    if (!tokenData) {
      return false;
    }

    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Get token statistics
   */
  getStats() {
    const now = Date.now();
    let activeTokens = 0;
    let expiredTokens = 0;

    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiresAt) {
        expiredTokens++;
      } else {
        activeTokens++;
      }
    }

    return {
      activeTokens,
      expiredTokens,
      totalTokens: this.tokens.size
    };
  }

  /**
   * Clean up expired tokens
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.tokens.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`CSRF cleanup: Removed ${cleanedCount} expired tokens`);
    }

    // Schedule next cleanup
    setTimeout(() => this.cleanup(), 15 * 60 * 1000); // Every 15 minutes
  }

  /**
   * Middleware to generate CSRF token
   */
  generateTokenMiddleware() {
    return (req, res, next) => {
      const sessionId = req.sessionID || req.ip || 'default';
      const token = this.generateToken(sessionId);
      
      req.csrfToken = token;
      res.locals.csrfToken = token;
      
      next();
    };
  }

  /**
   * Middleware to validate CSRF token
   */
  validateTokenMiddleware() {
    return (req, res, next) => {
      // Skip validation for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const sessionId = req.sessionID || req.ip || 'default';
      const providedToken = req.headers['x-csrf-token'] || 
                           req.body._csrf || 
                           req.query._csrf;

      if (!providedToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF token missing',
          code: 'CSRF_TOKEN_MISSING'
        });
      }

      if (!this.validateToken(sessionId, providedToken)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        });
      }

      next();
    };
  }

  /**
   * Express route handler to get CSRF token
   */
  getTokenHandler() {
    return (req, res) => {
      const sessionId = req.sessionID || req.ip || 'default';
      let token = this.getToken(sessionId);
      
      if (!token) {
        token = this.generateToken(sessionId);
      }

      res.json({
        success: true,
        csrfToken: token,
        expiresIn: this.TOKEN_EXPIRY
      });
    };
  }

  /**
   * Double Submit Cookie implementation
   */
  doubleSubmitCookieMiddleware() {
    return (req, res, next) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const cookieToken = req.cookies['csrf-token'];
      const headerToken = req.headers['x-csrf-token'];

      if (!cookieToken || !headerToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF protection: Missing token in cookie or header',
          code: 'CSRF_DOUBLE_SUBMIT_MISSING'
        });
      }

      if (cookieToken !== headerToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF protection: Token mismatch',
          code: 'CSRF_DOUBLE_SUBMIT_MISMATCH'
        });
      }

      next();
    };
  }

  /**
   * Set CSRF cookie
   */
  setCsrfCookie(res, token) {
    res.cookie('csrf-token', token, {
      httpOnly: false, // Needs to be accessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.TOKEN_EXPIRY
    });
  }

  /**
   * Generate and set CSRF token in cookie
   */
  generateAndSetCookie() {
    return (req, res, next) => {
      const sessionId = req.sessionID || req.ip || 'default';
      const token = this.generateToken(sessionId);
      
      this.setCsrfCookie(res, token);
      req.csrfToken = token;
      
      next();
    };
  }

  /**
   * Clear all tokens (for testing or emergency)
   */
  clearAllTokens() {
    const count = this.tokens.size;
    this.tokens.clear();
    console.log(`CSRF: Cleared all ${count} tokens`);
    return count;
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions() {
    const sessions = [];
    const now = Date.now();

    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now <= tokenData.expiresAt) {
        sessions.push({
          sessionId,
          createdAt: new Date(tokenData.createdAt).toISOString(),
          expiresAt: new Date(tokenData.expiresAt).toISOString(),
          timeToExpiry: Math.max(0, tokenData.expiresAt - now)
        });
      }
    }

    return sessions;
  }
}

// Create singleton instance
const csrfService = new CSRFService();

module.exports = csrfService;

