const http = require('http');

const endpoints = [
  '/api/content/influencers?page=1&limit=5',
  '/api/content/categories',
  '/api/content/trending',
  '/api/content/new-arrivals',
  '/api/content/featured-brands'
];

console.log('🔍 Testing API Endpoints...\n');

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${url}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`${url}`);
          console.log(`  ✓ Success: ${parsed.success}`);
          console.log(`  ✓ Items: ${parsed.data?.length || 0}\n`);
        } catch (e) {
          console.log(`${url} - Error parsing response`);
        }
        resolve();
      });
    });
    req.on('error', err => {
      console.log(`${url} - Error: ${err.message}`);
      resolve();
    });
  });
}

(async () => {
  for (const url of endpoints) {
    await testEndpoint(url);
  }
})();
