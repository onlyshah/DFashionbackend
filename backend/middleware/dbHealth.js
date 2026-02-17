const { getPostgresConnection } = require('../config/postgres');

// Middleware to enforce DB connectivity for /api routes
module.exports = async function dbHealth(req, res, next) {
  try {
    const sequelize = await getPostgresConnection();
    if (!sequelize) {
      const err = new Error('Database not available');
      err.status = 503;
      return next(err);
    }

    // Quick ping - do not throw in production for transient errors
    try {
      await sequelize.authenticate();
    } catch (e) {
      const err = new Error('Database connection unhealthy');
      err.status = 503;
      return next(err);
    }

    next();
  } catch (error) {
    const err = new Error('Database health check failed');
    err.status = 503;
    next(err);
  }
};
