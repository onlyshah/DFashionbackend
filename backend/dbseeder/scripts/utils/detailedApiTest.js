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
          resolve({ 
            path, 
            success: json.success, 
            items: (json.data || []).length,
            data: JSON.stringify(json, null, 2),
            error: null 
          });
        } catch (e) {
          resolve({ path, success: false, items: 0, data: data, error: e.message });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ path, success: false, items: 0, data: '', error: error.message });
    });

    req.end();
  });
}

(async () => {
  console.log('🔍 Testing API Endpoints...\n');
  
  const endpoints = [
    '/api/content/categories',
    '/api/content/trending?page=1&limit=3',
    '/api/content/new-arrivals?page=1&limit=3',
    '/api/content/featured-brands?page=1&limit=3'
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`${result.path}`);
    console.log(`Success: ${result.success}, Items: ${result.items}`);
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      // Show first part of response
      const lines = result.data.split('\n').slice(0, 15);
      console.log(lines.join('\n'));
    }
    console.log('\n---\n');
  }
})();
