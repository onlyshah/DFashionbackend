'use strict';

const express = require('express');
const router = express.Router();

/**
 * ✅ Safe route loader
 */
const safeRoute = (path, file) => {
  try {
    const route = require(file);

    // Validate it's a router
    if (!route || typeof route !== 'function' || !route.stack) {
      console.warn(`⚠️ Invalid router: ${file}`);
      return;
    }

    router.use(path, route);
    console.log(`✅ Route loaded: ${path}`);

  } catch (err) {
    console.error(`❌ Route failed: ${path}`);
    console.error(`   → ${err.message}`);
  }
};

/* ================= AUTH ================= */
safeRoute('/auth', './auth');
safeRoute('/users', './users');
safeRoute('/users-admin', './usersAdmin');

/* ================= ECOM ================= */
safeRoute('/products', './products');
safeRoute('/categories', './categories');
safeRoute('/brands', './brands');
safeRoute('/cart', './cart');
safeRoute('/orders', './orders');
safeRoute('/payments', './payments');
safeRoute('/checkout', './checkout');
safeRoute('/wishlist', './wishlist');
safeRoute('/returns', './returns');

/* ================= INVENTORY ================= */
safeRoute('/inventory', './inventory');
safeRoute('/sellers', './sellers');
safeRoute('/vendor', './vendor');
safeRoute('/vendor-verification', './vendorVerification');

/* ================= SOCIAL ================= */
safeRoute('/posts', './posts');
safeRoute('/stories', './stories');
safeRoute('/reels', './reels');
safeRoute('/comments', './comments');
safeRoute('/post-likes', './postLikes');
safeRoute('/follows', './follows');
safeRoute('/product-comments', './productComments');
safeRoute('/product-shares', './productShares');

/* ================= ANALYTICS ================= */
safeRoute('/analytics', './analytics');
safeRoute('/analytics-overview', './analyticsOverview');
safeRoute('/search', './search');
safeRoute('/recommendations', './recommendations');

/* ================= CMS ================= */
safeRoute('/content', './content');
safeRoute('/content-routes', './contentRoutes');
safeRoute('/cms', './cms');
safeRoute('/marketing', './marketing');
safeRoute('/promotions', './promotions');
safeRoute('/feature-flags', './featureFlags');
safeRoute('/smart-collections', './smartCollections');
safeRoute('/style-inspiration', './styleInspiration');

/* ================= ADMIN ================= */
safeRoute('/admin', './admin');
safeRoute('/admin/categories', './admin-categories');
safeRoute('/admin/content', './admin-content');
safeRoute('/social-admin', './socialAdmin');
safeRoute('/module-management', './moduleManagement');
safeRoute('/role-management', './roleManagement');

/* ================= SYSTEM ================= */
safeRoute('/notifications', './notifications');
safeRoute('/alerts', './alerts');
safeRoute('/support', './support');
safeRoute('/upload', './upload');
safeRoute('/audit-logs', './auditLogs');
safeRoute('/compliance', './compliance');
safeRoute('/data-governance', './dataGovernance');
safeRoute('/logistics', './logistics');
safeRoute('/ecommerce-api', './ecommerceAPI');

/* ================= EXTRA ================= */
safeRoute('/rewards', './rewardRoutes');
safeRoute('/creators', './creators');
safeRoute('/live', './live');
safeRoute('/addresses', './addresses');

module.exports = router;