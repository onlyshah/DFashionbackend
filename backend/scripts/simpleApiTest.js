const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ path, success: json.success, items: (json.data || []).length, error: null });
        } catch (e) {
          resolve({ path, success: false, items: 0, error: e.message });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ path, success: false, items: 0, error: error.message });
    });

    req.end();
  });
}

(async () => {
  console.log('🔍 Testing API Endpoints...\n');
  
  const endpoints = [
    '/api/content/categories',
    '/api/content/trending',
    '/api/content/new-arrivals',
    '/api/content/featured-brands'
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`${result.path}`);
    console.log(`  ✓ Success: ${result.success}`);
    console.log(`  ✓ Items: ${result.items}`);
    if (result.error) console.log(`  ✗ Error: ${result.error}`);
    console.log();
  }
})();
