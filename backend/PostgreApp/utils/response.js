// Standard response utility for consistent API responses
// Flexible signatures supported to ease incremental adoption across controllers.

const makeResponseBody = ({ success = true, data = null, message = '', code = '' } = {}) => ({
  success,
  message: message || (success ? 'OK' : 'Error'),
  data: typeof data === 'undefined' ? null : data,
  code: code || (success ? 200 : 500),
  timestamp: new Date().toISOString()
});

// sendResponse supports two call styles:
// 1) sendResponse(res, statusCode, success, data, message)
// 2) sendResponse(res, { success, data, message, code })
const sendResponse = (res, a, b, c, d) => {
  if (typeof a === 'object' && a !== null) {
    const payload = a;
    const status = payload.statusCode || payload.code || 200;
    res.status(status).json(makeResponseBody(payload));
    return;
  }

  const statusCode = typeof a === 'number' ? a : 200;
  const success = typeof b === 'boolean' ? b : true;
  const data = typeof c !== 'undefined' ? c : null;
  const message = typeof d === 'string' ? d : '';
  res.status(statusCode).json(makeResponseBody({ success, data, message, code: statusCode }));
};

// sendError supports two call styles:
// 1) sendError(res, statusCode, message, error)
// 2) sendError(res, { statusCode, message, error })
const sendError = (res, a, b, c) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let error = null;

  if (typeof a === 'object' && a !== null) {
    statusCode = a.statusCode || statusCode;
    message = a.message || message;
    error = a.error || null;
  } else {
    statusCode = typeof a === 'number' ? a : statusCode;
    message = typeof b === 'string' ? b : message;
    error = c || null;
  }

  const body = makeResponseBody({ success: false, data: null, message, code: statusCode });
  if (process.env.NODE_ENV === 'development' && error) body.error = error;
  res.status(statusCode).json(body);
};

module.exports = { sendResponse, sendError };
