const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  if (!err) return next();

  // Convert to ApiError if necessary
  if (!(err instanceof ApiError)) {
    const apiErr = new ApiError(err.message || 'Internal Server Error', err.statusCode || 500, err.errorCode || 'ERR_INTERNAL');
    apiErr.stack = err.stack;
    err = apiErr;
  }

  // Log error
  try {
    if (typeof err.log === 'function') err.log();
    else console.error(err.stack || err.message);
  } catch (e) {
    console.error('Error while logging error', e);
  }

  const payload = {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error'
  };

  if (process.env.NODE_ENV === 'development') payload.error = { name: err.name, stack: err.stack };

  return sendError(res, payload);
};

module.exports = errorHandler;
