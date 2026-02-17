const { sendError } = require('../utils/response');

module.exports = (err, req, res, next) => {
  try {
    const status = err && err.status ? err.status : 500;
    const message = err && err.message ? err.message : 'Internal Server Error';
    console.error('Unhandled Error:', err && err.stack ? err.stack : err);
    return sendError(res, { statusCode: status, message, error: err });
  } catch (e) {
    console.error('Error while handling error:', e);
    res.status(500).json({ success: false, message: 'Fatal error' });
  }
};
