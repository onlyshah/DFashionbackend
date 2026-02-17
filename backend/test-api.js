const http = require('http');

function apiCall(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    console.log('📍 GET /api/admin/users/customers?page=1&limit=10');
    const customers = await apiCall('/api/admin/users/customers?page=1&limit=10');
    console.log(`Status: ${customers.status}`);
    console.log(`Data count: ${customers.data?.data?.length || 0}`);
    if (customers.data?.data?.length > 0) {
      console.log(`✅ Sample: ${customers.data.data[0].username}`);
    } else {
      console.log(`❌ No data returned`);
    }

    console.log('\n📍 GET /api/admin/users/vendors?page=1&limit=10');
    const vendors = await apiCall('/api/admin/users/vendors?page=1&limit=10');
    console.log(`Status: ${vendors.status}`);
    console.log(`Data count: ${vendors.data?.data?.length || 0}`);
    if (vendors.data?.data?.length > 0) {
      console.log(`✅ Sample: ${vendors.data.data[0].username}`);
    } else {
      console.log(`❌ No data returned`);
    }

    console.log('\n📍 GET /api/admin/users/admins?page=1&limit=10');
    const admins = await apiCall('/api/admin/users/admins?page=1&limit=10');
    console.log(`Status: ${admins.status}`);
    console.log(`Data count: ${admins.data?.data?.length || 0}`);
    if (admins.data?.data?.length > 0) {
      console.log(`✅ Sample: ${admins.data.data[0].username}`);
    } else {
      console.log(`❌ No data returned`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEndpoints();
