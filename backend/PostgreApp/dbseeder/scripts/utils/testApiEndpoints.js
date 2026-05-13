#!/usr/bin/env node
/**
 * 🧪 Test API Endpoints
 */

const http = require('http');

const tests = [
  { path: '/api/content/categories?limit=3', name: 'Categories' },
  { path: '/api/content/trending?limit=3', name: 'Trending' },
  { path: '/api/content/new-arrivals?limit=3', name: 'New Arrivals' },
  { path: '/api/content/featured-brands?limit=3', name: 'Featured Brands' }
];

async function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = json.data?.length || 0;
          console.log(`${name}: ${count} items`);
        } catch (e) {
          console.log(`${name}: Invalid response`);
        }
        resolve();
      });
    });
    req.on('error', (err) => {
      console.log(`${name}: Error - ${err.message}`);
      resolve();
    });
  });
}

(async () => {
  console.log('\n📊 Testing API Endpoints...\n');
  for (const test of tests) {
    await testEndpoint(test.path, test.name);
  }
  console.log('\n');
  process.exit(0);
})();
