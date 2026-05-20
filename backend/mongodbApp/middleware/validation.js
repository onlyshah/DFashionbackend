const { validationResult, check } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Reusable validators
exports.email = check('email').isEmail().withMessage('Invalid email address').normalizeEmail();
exports.password = check('password')
  .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  .matches(/[0-9]/).withMessage('Password must contain a number')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter');
exports.phone = check('phone').optional().isMobilePhone().withMessage('Invalid phone number');
exports.url = (field = 'url') => check(field).optional().isURL().withMessage('Invalid URL');
exports.number = (field) => check(field).optional().isNumeric().withMessage(`${field} must be a number`);

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extracted = {};
    errors.array().map(err => extracted[err.param] = err.msg);
    return next(new ApiError('Validation failed', 422, 'ERR_VALIDATION', extracted));
  }
  next();
};
