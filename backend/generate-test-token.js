const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = {
  userId: 'test-admin-123',
  email: 'admin@dfashion.test',
  role: 'super_admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const secret = process.env.JWT_SECRET || 'dfashion_super_secret_jwt_key_change_in_production_2024';
const token = jwt.sign(payload, secret);

console.log('\n' + '═'.repeat(80));
console.log('🔐 TEST ADMIN TOKEN - Copy and use this to authenticate');
console.log('═'.repeat(80));
console.log('\nTOKEN:');
console.log(token);
console.log('\n═'.repeat(80));
console.log('\n📋 HOW TO USE:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Console tab');
console.log('3. Paste this command:');
console.log(`   localStorage.setItem('admin_token', '${token}')`);
console.log('4. Reload the page (Ctrl+R or Cmd+R)');
console.log('\n✅ Now all admin API calls will include authentication');
console.log('\n═'.repeat(80) + '\n');
