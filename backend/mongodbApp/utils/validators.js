const mongoose = require('mongoose');

exports.validateEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

exports.validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
};

exports.validatePhone = (phone) => {
  if (!phone) return false;
  const re = /^\+?[0-9\-\s()]{7,20}$/;
  return re.test(phone);
};

exports.validateUrl = (url) => {
  if (!url) return false;
  try { new URL(url); return true; } catch (e) { return false; }
};

exports.validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.validatePagination = (page, limit) => {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { page: p, limit: l };
};

exports.validatePriceRange = (min, max) => {
  const a = parseFloat(min);
  const b = parseFloat(max);
  if (isNaN(a) || isNaN(b)) return false;
  return a >= 0 && b >= a;
};
