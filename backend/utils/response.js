// Standard response utility for consistent API responses

const sendResponse = (res, statusCode, success, data = null, message = '', code = '') => {
  res.status(statusCode).json({
    success,
    data,
    message,
    code: code || statusCode,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, statusCode, message, error = null, code = '') => {
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
    code: code || statusCode,
    timestamp: new Date().toISOString()
  });
};

module.exports = { sendResponse, sendError };
