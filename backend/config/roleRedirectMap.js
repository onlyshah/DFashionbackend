/**
 * Role → Redirect Path Mapping
 * Used by both Backend (Auth Controller) and Frontend (Login Component)
 * Keep in sync across both projects for consistent redirects
 */

const roleRedirectMap = {
  // Admin roles
  'super admin': '/admin/dashboard/super',
  'super_admin': '/admin/dashboard/super',
  'super-admin': '/admin/dashboard/super',
  'admin': '/admin/dashboard',
  'platform admin': '/admin/dashboard',
  'platform_admin': '/admin/dashboard',

  // Seller/Vendor roles
  'seller': '/seller/dashboard',
  'vendor': '/seller/dashboard',
  'brand owner': '/seller/dashboard',
  'brand_owner': '/seller/dashboard',
  'verified seller': '/seller/dashboard',
  'verified_seller': '/seller/dashboard',

  // Customer roles
  'customer': '/store/home',
  'prime customer': '/store/home',
  'prime_customer': '/store/home',
  'end_user': '/store/home',
  'end-user': '/store/home',

  // Creator/Influencer roles
  'creator': '/creator/studio',
  'verified user': '/creator/studio',
  'verified_user': '/creator/studio',
  'influencer': '/creator/studio',

  // Support roles
  'support agent': '/support/tickets',
  'support_agent': '/support/tickets',
  'support': '/support/tickets',

  // Warehouse/Logistics roles
  'warehouse manager': '/logistics/warehouses',
  'warehouse_manager': '/logistics/warehouses',
  'delivery partner': '/logistics/deliveries',
  'delivery_partner': '/logistics/deliveries',

  // Finance/Marketing roles
  'finance manager': '/finance/dashboard',
  'finance_manager': '/finance/dashboard',
  'marketing manager': '/marketing/campaigns',
  'marketing_manager': '/marketing/campaigns',

  // Moderation roles
  'moderator': '/moderation/panel',
  'senior moderator': '/moderation/panel',
  'senior_moderator': '/moderation/panel'
};

/**
 * Get redirect path for a given role
 * @param {string} role - User role name (case-insensitive)
 * @param {string} defaultPath - Fallback path if role not found (default: '/')
 * @returns {string} - Redirect path
 */
function getRedirectPathForRole(role, defaultPath = '/') {
  if (!role) return defaultPath;
  
  const normalizedRole = String(role).toLowerCase().trim();
  return roleRedirectMap[normalizedRole] || defaultPath;
}

module.exports = {
  roleRedirectMap,
  getRedirectPathForRole
};
