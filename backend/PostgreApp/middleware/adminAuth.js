const verifyAdminToken = (req, res, next) => {
  req.user = { id: 1, role: 'admin' }; // Mock user
  next();
};

const requirePermission = (permission) => (req, res, next) => next();
const requireRole = (role) => (req, res, next) => next();
const requireDepartment = (dept) => (req, res, next) => next();

module.exports = {
  verifyAdminToken,
  requirePermission,
  requireRole,
  requireDepartment
};
