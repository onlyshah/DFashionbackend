const express = require('express');
const router = express.Router();

// Health check endpoint (MUST be first - no auth needed)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    database: 'MongoDB',
    message: 'DFashion MongoDB API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register all route modules with error handling
const routeModules = [
  { path: '/auth', file: './auth', name: 'Auth' },
  { path: '/products', file: './productsPhase3', name: 'Products (Phase 3)' },
  { path: '/categories', file: './categoriesPhase3', name: 'Categories (Phase 3)' },
  { path: '/users', file: './users', name: 'Users' },
  { path: '/addresses', file: './addresses', name: 'Addresses' },
  { path: '/cart', file: './cart', name: 'Cart' },
  { path: '/orders', file: './ordersPhase3', name: 'Orders (Phase 3)' },
  { path: '/payments', file: './paymentsPhase3', name: 'Payments (Phase 3)' },
  { path: '/wishlist', file: './wishlist', name: 'Wishlist' },
  { path: '/posts', file: './postsPhase4', name: 'Posts (Phase 4)' },
  { path: '/reels', file: './reelsPhase4', name: 'Reels (Phase 4)' },
  { path: '/stories', file: './storiesPhase4', name: 'Stories (Phase 4)' },
  { path: '/comments', file: './commentsPhase4', name: 'Comments (Phase 4)' },
  { path: '/follows', file: './followsPhase4', name: 'Follows (Phase 4)' },
  { path: '/notifications', file: './notificationsPhase5', name: 'Notifications (Phase 5)' },
  { path: '/messages', file: './messagesPhase5', name: 'Messages (Phase 5)' },
  { path: '/admin/dashboard', file: './adminDashboardPhase6', name: 'Admin Dashboard (Phase 6)' },
  { path: '/admin/users', file: './usersManagementPhase6', name: 'Users Management (Phase 6)' },
  { path: '/admin/products', file: './productsManagementPhase6', name: 'Products Management (Phase 6)' },
  { path: '/admin/orders', file: './ordersManagementPhase6', name: 'Orders Management (Phase 6)' },
  { path: '/promotions', file: './promotionsPhase7', name: 'Promotions (Phase 7)' },
  { path: '/vendors', file: './vendorPhase7', name: 'Vendors (Phase 7)' },
  { path: '/inventory', file: './inventoryPhase7', name: 'Inventory (Phase 7)' },
  { path: '/returns', file: './returnsPhase7', name: 'Returns (Phase 7)' },
  { path: '/support', file: './supportPhase7', name: 'Support (Phase 7)' },
  { path: '/live-shopping', file: './livePhase7', name: 'Live Shopping (Phase 7)' },
  { path: '/search', file: './searchRecommendationsPhase8', name: 'Search & Recommendations (Phase 8)' },
  { path: '/analytics', file: './analyticsReportsPhase8', name: 'Analytics & Reports (Phase 8)' },
  { path: '/content', file: './contentManagementPhase8', name: 'Content Management (Phase 8)' },
  { path: '/social', file: './socialExtendedPhase8', name: 'Social Extended (Phase 8)' },
  { path: '/badges-rewards', file: './badgesRewardsPhase8', name: 'Badges & Rewards (Phase 8)' },
  { path: '/compliance', file: './compliancePrivacyPhase8', name: 'Compliance & Privacy (Phase 8)' },
  { path: '/notifications-extended', file: './notificationsExtendedPhase8', name: 'Notifications Extended (Phase 8)' },
  { path: '/marketplace', file: './marketplacePhase8', name: 'Marketplace Features (Phase 8)' },
];

routeModules.forEach(({ path, file, name }) => {
  try {
    const routeModule = require(file);
    router.use(path, routeModule);
    console.log(`✅ ${name} routes loaded: /api${path}`);
  } catch (err) {
    console.warn(`⚠️  ${name} routes failed to load from ${file}: ${err.message}`);
  }
});

// 404 handler for undefined routes
router.use((req, res) => {
  console.warn(`⚠️  Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    data: null,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
