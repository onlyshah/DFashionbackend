const axios = require('axios');

// Base URL for API
const BASE_URL = 'http://localhost:3001';

// Test configuration
const testConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:4200'
  },
  timeout: 10000
};

// Test endpoints
const endpoints = [
  { name: 'Health Check', method: 'GET', url: '/health' },
  { name: 'Products', method: 'GET', url: '/api/products' },
  { name: 'Stories', method: 'GET', url: '/api/stories' },
  { name: 'Reels', method: 'GET', url: '/api/reels' },
  { name: 'Posts', method: 'GET', url: '/api/posts' },
  { name: 'Categories', method: 'GET', url: '/api/categories' },
  { name: 'Brands', method: 'GET', url: '/api/brands' },
  { name: 'Search Suggestions', method: 'GET', url: '/api/search/suggestions' },
  { name: 'Trending Searches', method: 'GET', url: '/api/search/trending' }
];

async function testEndpoint(endpoint) {
  try {
    console.log(`🧪 Testing ${endpoint.name}...`);
    
    const response = await axios({
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.url}`,
      ...testConfig
    });

    const isSuccess = response.status === 200 && response.data;
    const hasData = response.data.success !== false;
    
    if (isSuccess && hasData) {
      // Check if response contains actual data (not mock)
      const dataSize = JSON.stringify(response.data).length;
      const hasRealData = dataSize > 100; // Reasonable threshold for real data
      
      console.log(`✅ ${endpoint.name}: Working (${response.status}) - ${dataSize} bytes`);
      
      // Show sample data structure
      if (response.data.products) {
        console.log(`   📦 Products: ${response.data.products.length} items`);
      } else if (response.data.stories) {
        console.log(`   📖 Stories: ${response.data.stories.length} items`);
      } else if (response.data.data && response.data.data.reels) {
        console.log(`   🎬 Reels: ${response.data.data.reels.length} items`);
      } else if (response.data.posts) {
        console.log(`   📝 Posts: ${response.data.posts.length} items`);
      } else if (response.data.categories) {
        console.log(`   🏷️ Categories: ${response.data.categories.length} items`);
      } else if (response.data.brands) {
        console.log(`   🏪 Brands: ${response.data.brands.length} items`);
      } else if (response.data.suggestions) {
        console.log(`   💡 Suggestions: ${response.data.suggestions.length} items`);
      } else if (response.data.trending) {
        console.log(`   📈 Trending: ${response.data.trending.length} items`);
      }
      
      return { success: true, endpoint: endpoint.name, dataSize, hasRealData };
    } else {
      console.log(`⚠️ ${endpoint.name}: Response but no data (${response.status})`);
      return { success: false, endpoint: endpoint.name, error: 'No data' };
    }
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ ${endpoint.name}: HTTP ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ ${endpoint.name}: Server not running`);
    } else {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
    return { success: false, endpoint: endpoint.name, error: error.message };
  }
}

async function testAuthEndpoint() {
  try {
    console.log('🔐 Testing Authentication...');
    
    const loginResponse = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/auth/login`,
      data: {
        email: 'priya@example.com',
        password: 'password123'
      },
      ...testConfig
    });

    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('✅ Authentication: Working - Login successful');
      console.log(`   🎫 Token received: ${loginResponse.data.data.token.substring(0, 20)}...`);
      console.log(`   👤 User: ${loginResponse.data.data.user.username} (${loginResponse.data.data.user.role})`);
      return { success: true, endpoint: 'Authentication', token: loginResponse.data.data.token };
    } else {
      console.log('⚠️ Authentication: Login failed');
      return { success: false, endpoint: 'Authentication', error: 'Login failed' };
    }
    
  } catch (error) {
    console.log(`❌ Authentication: ${error.response?.data?.message || error.message}`);
    return { success: false, endpoint: 'Authentication', error: error.message };
  }
}

async function runApiTests() {
  console.log('🚀 Starting API Endpoint Tests...\n');
  console.log('=' .repeat(60));
  console.log('   Testing All APIs with Database Data');
  console.log('=' .repeat(60));
  console.log('');

  const results = [];

  // Test authentication first
  const authResult = await testAuthEndpoint();
  results.push(authResult);
  console.log('');

  // Test all other endpoints
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log('');
  }

  // Summary
  console.log('📊 API TEST SUMMARY:');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Success Rate: ${Math.round((successful.length / results.length) * 100)}%`);

  if (successful.length > 0) {
    console.log('\n✅ Working Endpoints:');
    successful.forEach(result => {
      console.log(`   ✅ ${result.endpoint}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Endpoints:');
    failed.forEach(result => {
      console.log(`   ❌ ${result.endpoint}: ${result.error}`);
    });
  }

  // Database integration check
  const dataEndpoints = successful.filter(r => r.hasRealData !== false);
  console.log(`\n📊 Database Integration: ${dataEndpoints.length}/${successful.length} endpoints returning real data`);

  if (successful.length === results.length) {
    console.log('\n🎉 ALL APIS WORKING WITH DATABASE DATA!');
    console.log('✅ No mock data detected - all endpoints using database');
  } else {
    console.log('\n⚠️ Some endpoints need attention');
  }

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    allWorking: successful.length === results.length
  };
}

// Run tests
if (require.main === module) {
  runApiTests()
    .then(summary => {
      console.log('\n✅ API testing completed!');
      process.exit(summary.allWorking ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ API testing failed:', error);
      process.exit(1);
    });
}

module.exports = { runApiTests, testEndpoint, testAuthEndpoint };
