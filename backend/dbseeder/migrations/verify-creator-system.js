#!/usr/bin/env node
/**
 * ============================================================================
 * CREATOR SYSTEM VERIFICATION SCRIPT
 * ============================================================================
 * Purpose: Verify the permission-based creator system is working correctly
 * Usage: node verify-creator-system.js
 */

const models = require('../../models_sql');
const PermissionHelper = require('../../utils/permissionHelper');
const { Op } = require('sequelize');

const RED = '\x1b[91m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const BLUE = '\x1b[94m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'default') {
  const colors = {
    success: GREEN,
    error: RED,
    warning: YELLOW,
    info: BLUE,
    default: RESET
  };
  console.log(`${colors[type]}${message}${RESET}`);
}

function logTest(name, result) {
  if (result) {
    log(`✅ ${name}`, 'success');
    testsPassed++;
  } else {
    log(`❌ ${name}`, 'error');
    testsFailed++;
  }
}

async function verifyPermissions() {
  log(`\n${BOLD}📋 VERIFYING PERMISSIONS${RESET}`, 'info');
  log('='.repeat(50), 'info');

  try {
    const Permission = models.Permission;

    const requiredPermissions = [
      'can_create_posts',
      'can_create_reels',
      'can_create_stories',
      'can_create_live_streams',
      'can_manage_own_content',
      'can_manage_all_content',
      'can_tag_products',
      'can_monetize_content'
    ];

    for (const permName of requiredPermissions) {
      const perm = await Permission.findOne({ where: { name: permName }, raw: true });
      logTest(`Permission exists: ${permName}`, !!perm);
      if (perm) {
        log(`   └─ ID: ${perm.id}`, 'default');
      }
    }
  } catch (error) {
    log(`Error checking permissions: ${error.message}`, 'error');
  }
}

async function verifyRoles() {
  log(`\n${BOLD}🔐 VERIFYING ROLES${RESET}`, 'info');
  log('='.repeat(50), 'info');

  try {
    const Role = models.Role;

    const roles = await Role.findAll({ attributes: ['id', 'name', 'display_name'], raw: true });
    log(`Found ${roles.length} roles:`, 'info');

    const expectedRoles = ['super_admin', 'admin', 'manager', 'user', 'seller'];
    for (const roleData of roles) {
      const isExpected = expectedRoles.includes(roleData.name);
      logTest(`Role exists: ${roleData.name}`, isExpected);
      log(`   └─ ${roleData.display_name} (ID: ${roleData.id})`, 'default');
    }

    // Verify no 'creator' role (should not exist)
    const creatorRole = await Role.findOne({ where: { name: 'creator' }, raw: true });
    logTest(`Creator role does NOT exist (as intended)`, !creatorRole);
    if (creatorRole) {
      log(`   ⚠️ Found legacy creator role! This should be removed.`, 'warning');
    }
  } catch (error) {
    log(`Error checking roles: ${error.message}`, 'error');
  }
}
async function verifyRolePermissions() {
  log(`\n${BOLD}🔗 VERIFYING ROLE-PERMISSION ASSIGNMENTS${RESET}`, 'info');
  log('='.repeat(50), 'info');

  try {
    const Role = models.Role;
    const RolePermission = models.RolePermission;
    const Permission = models.Permission;

    const contentPermissions = [
      'can_create_posts',
      'can_create_reels',
      'can_create_stories',
      'can_create_live_streams'
    ];

    // Get roles
    const userRole = await Role.findOne({ where: { name: 'user' }, attributes: ['id'], raw: true });
    const sellerRole = await Role.findOne({ where: { name: 'seller' }, attributes: ['id'], raw: true });
    const superAdminRole = await Role.findOne({ where: { name: 'super_admin' }, attributes: ['id'], raw: true });

    if (!userRole || !sellerRole || !superAdminRole) {
      log('❌ Could not find required roles', 'error');
      return;
    }

    log(`\nRoles found:`, 'info');
    log(`  ├─ user: ${userRole.id}`, 'default');
    log(`  ├─ seller: ${sellerRole.id}`, 'default');
    log(`  └─ super_admin: ${superAdminRole.id}`, 'default');

    // Check user role permissions
    log(`\n📌 Checking USER role permissions:`, 'info');
    const userPerms = await RolePermission.findAll({
      where: { roleId: userRole.id },
      include: [{ model: Permission, attributes: ['name'], as: 'permission' }],
      raw: true
    });
    logTest(`User role has permissions`, userPerms.length > 0);
    log(`   └─ Total permissions: ${userPerms.length}`, 'default');

    // Check seller role permissions
    log(`\n📌 Checking SELLER role permissions:`, 'info');
    const sellerPerms = await RolePermission.findAll({
      where: { roleId: sellerRole.id },
      include: [{ model: Permission, attributes: ['name'], as: 'permission' }],
      raw: true
    });
    logTest(`Seller role has permissions`, sellerPerms.length > 0);
    log(`   └─ Total permissions: ${sellerPerms.length}`, 'default');

    // Check super_admin role permissions
    log(`\n📌 Checking SUPER_ADMIN role permissions:`, 'info');
    const adminPerms = await RolePermission.findAll({
      where: { roleId: superAdminRole.id },
      include: [{ model: Permission, attributes: ['name'], as: 'permission' }],
      raw: true
    });
    logTest(`Super admin role has permissions`, adminPerms.length > 0);
    log(`   └─ Total permissions: ${adminPerms.length}`, 'default');

    // Verify content permissions are assigned
    for (const permName of contentPermissions) {
      const perm = await Permission.findOne({ where: { name: permName }, attributes: ['id'], raw: true });
      if (perm) {
        const hasInUser = userPerms.some(p => p.permissionId === perm.id);
        const hasInSeller = sellerPerms.some(p => p.permissionId === perm.id);
        log(`   ├─ ${permName}: user=${hasInUser ? '✓' : '✗'} seller=${hasInSeller ? '✓' : '✗'}`, 'default');
      }
    }
  } catch (error) {
    log(`Error checking role-permissions: ${error.message}`, 'error');
  }
}

async function verifyUsers() {
  log(`\n${BOLD}👥 VERIFYING USERS${RESET}`, 'info');
  log('='.repeat(50), 'info');

  try {
    const User = models.User;
    const Role = models.Role;

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role_id'],
      include: [{ model: Role, attributes: ['name'], as: 'roleData' }],
      raw: true
    });

    logTest(`Users exist in database`, users.length > 0);
    log(`   └─ Total users: ${users.length}`, 'default');

    // Count by role
    const byRole = {};
    users.forEach(u => {
      const roleName = u['roleData.name'] || 'unknown';
      byRole[roleName] = (byRole[roleName] || 0) + 1;
    });

    log(`\nUsers by role:`, 'info');
    for (const [role, count] of Object.entries(byRole)) {
      log(`  ├─ ${role}: ${count} users`, 'default');
    }

    // Verify specific test users
    const testUsers = ['customer1@example.com', 'seller1@example.com', 'admin@example.com'];
    log(`\nVerifying test users:`, 'info');
    for (const email of testUsers) {
      const user = users.find(u => u.email === email);
      logTest(`Test user exists: ${email}`, !!user);
      if (user) {
        log(`   └─ Role: ${user['roleData.name']}`, 'default');
      }
    }
  } catch (error) {
    log(`Error checking users: ${error.message}`, 'error');
  }
}

async function verifyPermissionHelper() {
  log(`\n${BOLD}🔧 VERIFYING PERMISSION HELPER${RESET}`, 'info');
  log('='.repeat(50), 'info');

  try {
    const User = models.User;

    // Find a seller user
    const seller = await User.findOne({
      where: { email: 'seller1@example.com' },
      attributes: ['id'],
      raw: true
    });

    if (!seller) {
      log(`⚠️ Seller test user not found - skipping permission helper tests`, 'warning');
      return;
    }

    log(`Testing seller: ${seller.id}`, 'info');

    // Test hasPerm permission
    const canCreatePosts = await PermissionHelper.hasPermission(
      seller.id,
      'can_create_posts',
      models
    );
    logTest(`PermissionHelper.hasPermission works`, typeof canCreatePosts === 'boolean');
    log(`   └─ Seller can create posts: ${canCreatePosts}`, 'default');

    // Test canCreateContent
    const isCreator = await PermissionHelper.canCreateContent(seller.id, models);
    logTest(`PermissionHelper.canCreateContent works`, typeof isCreator === 'boolean');
    log(`   └─ Seller is creator: ${isCreator}`, 'default');

    // Test canMonetizeContent
    const canMonetize = await PermissionHelper.canMonetizeContent(seller.id, models);
    logTest(`PermissionHelper.canMonetizeContent works`, typeof canMonetize === 'boolean');
    log(`   └─ Seller can monetize: ${canMonetize}`, 'default');

    // Test getUserPermissions
    const allPerms = await PermissionHelper.getUserPermissions(seller.id, models);
    logTest(`PermissionHelper.getUserPermissions returns array`, Array.isArray(allPerms));
    log(`   └─ Seller has ${allPerms.length} permissions`, 'default');
  } catch (error) {
    log(`Error testing permission helper: ${error.message}`, 'error');
  }
}

async function verifyContentModels() {
  log(`\n${BOLD}📊 VERIFYING CONTENT MODELS${RESET}`, 'info');
  log('='.repeat(50), 'info');

  try {
    const Post = models.Post;
    const Reel = models.Reel;
    const Story = models.Story;

    // Check if models have required fields
    const postAttrs = Post.rawAttributes;
    const reelAttrs = Reel.rawAttributes;
    const storyAttrs = Story.rawAttributes;

    const expectedPostFields = ['userId', 'content', 'contentType', 'status', 'likesCount', 'productIds'];
    const expectedReelFields = ['userId', 'videoUrl', 'contentType', 'status', 'duration', 'productIds'];
    const expectedStoryFields = ['userId', 'mediaUrl', 'expiresAt', 'status', 'productIds'];

    let postFieldsOk = expectedPostFields.every(f => f in postAttrs);
    let reelFieldsOk = expectedReelFields.every(f => f in reelAttrs);
    let storyFieldsOk = expectedStoryFields.every(f => f in storyAttrs);

    logTest(`Post model has enhanced fields`, postFieldsOk);
    logTest(`Reel model has enhanced fields`, reelFieldsOk);
    logTest(`Story model has enhanced fields`, storyFieldsOk);

    log(`\nPost model fields (sample):`, 'info');
    log(`   ├─ contentType: ${!!postAttrs['contentType']}`, 'default');
    log(`   ├─ likesCount: ${!!postAttrs['likesCount']}`, 'default');
    log(`   ├─ publishedAt: ${!!postAttrs['publishedAt']}`, 'default');
    log(`   └─ earnings: ${!!postAttrs['earnings']}`, 'default');
  } catch (error) {
    log(`Error checking content models: ${error.message}`, 'error');
  }
}

async function main() {
  log(`\n${ BOLD}${BLUE}╔════════════════════════════════════════════════════════╗`, 'default');
  log(`║   CREATOR SYSTEM VERIFICATION SCRIPT                  ║`, 'info');
  log(`╚════════════════════════════════════════════════════════╝${RESET}`, 'default');

  try {
    await verifyPermissions();
    await verifyRoles();
    await verifyRolePermissions();
    await verifyUsers();
    await verifyPermissionHelper();
    await verifyContentModels();

    log(`\n${BOLD}${YELLOW}═══════════════════════════════════════════════════════${RESET}`, 'default');
    log(`${BOLD}📊 TEST SUMMARY${RESET}`, 'info');
    log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`, 'default');
    log(`✅ Tests Passed: ${GREEN}${testsPassed}${RESET}`, 'default');
    log(`❌ Tests Failed: ${RED}${testsFailed}${RESET}`, 'default');
    log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`, 'info');

    if (testsFailed === 0) {
      log(`\n${GREEN}${BOLD}🎉 All checks passed! Creator system is properly configured.${RESET}`, 'success');
    } else {
      log(`\n${RED}${BOLD}⚠️ Some checks failed. Review errors above.${RESET}`, 'error');
    }

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
