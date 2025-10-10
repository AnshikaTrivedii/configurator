const fetch = require('node-fetch');

// This script tests the production API endpoints to verify they're working correctly
// Replace YOUR_RAILWAY_URL with your actual Railway backend URL

async function testProductionAPI() {
  const RAILWAY_URL = process.env.RAILWAY_URL || 'https://your-backend.railway.app';
  const API_BASE_URL = `${RAILWAY_URL}/api`;
  
  console.log('🧪 Testing Production API');
  console.log('========================');
  console.log(`🔗 Testing API at: ${API_BASE_URL}`);
  
  try {
    // Test 1: Health check endpoint
    console.log('\n1️⃣ Testing health check endpoint...');
    const healthResponse = await fetch(`${RAILWAY_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed');
      console.log(`   Response: ${healthData.message}`);
    } else {
      console.log('❌ Health check failed');
      console.log(`   Status: ${healthResponse.status}`);
    }
    
    // Test 2: Test login endpoint (without credentials)
    console.log('\n2️⃣ Testing login endpoint structure...');
    const loginResponse = await fetch(`${API_BASE_URL}/sales/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.status === 400 && loginData.message === 'Invalid email or password') {
      console.log('✅ Login endpoint is working correctly');
      console.log('   (Expected error response for invalid credentials)');
    } else {
      console.log('❌ Login endpoint not working as expected');
      console.log(`   Status: ${loginResponse.status}`);
      console.log(`   Response: ${JSON.stringify(loginData)}`);
    }
    
    // Test 3: Test with actual Super Admin credentials
    console.log('\n3️⃣ Testing Super Admin login...');
    const superLoginResponse = await fetch(`${API_BASE_URL}/sales/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email: 'super@orion-led.com', 
        password: 'Orion@123' 
      })
    });
    
    const superLoginData = await superLoginResponse.json();
    
    if (superLoginResponse.ok && superLoginData.success) {
      console.log('✅ Super Admin login successful!');
      console.log(`   User: ${superLoginData.user.name} (${superLoginData.user.email})`);
      console.log(`   Role: ${superLoginData.user.role}`);
      console.log(`   Token length: ${superLoginData.token.length}`);
      
      // Test 4: Test dashboard endpoint with the token
      console.log('\n4️⃣ Testing dashboard endpoint...');
      const dashboardResponse = await fetch(`${API_BASE_URL}/sales/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${superLoginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const dashboardData = await dashboardResponse.json();
      
      if (dashboardResponse.ok && dashboardData.success) {
        console.log('✅ Dashboard endpoint working');
        console.log(`   Sales persons: ${dashboardData.data.length}`);
        console.log(`   Total quotations: ${dashboardData.stats.totalQuotations}`);
      } else {
        console.log('❌ Dashboard endpoint failed');
        console.log(`   Status: ${dashboardResponse.status}`);
        console.log(`   Response: ${JSON.stringify(dashboardData)}`);
      }
      
    } else {
      console.log('❌ Super Admin login failed');
      console.log(`   Status: ${superLoginResponse.status}`);
      console.log(`   Response: ${JSON.stringify(superLoginData)}`);
      
      if (superLoginData.message === 'Invalid email or password') {
        console.log('\n🔍 This confirms the issue:');
        console.log('   - The API is reachable');
        console.log('   - The login endpoint is working');
        console.log('   - But the Super Admin credentials are not working');
        console.log('\n💡 Possible causes:');
        console.log('   1. Environment variables not set correctly in Railway');
        console.log('   2. Database connection pointing to wrong database');
        console.log('   3. JWT_SECRET mismatch between local and production');
        console.log('   4. Super Admin user not exists in production database');
      }
    }
    
  } catch (error) {
    console.log('❌ API test failed:', error.message);
    console.log('\n💡 Possible causes:');
    console.log('   1. Railway URL is incorrect');
    console.log('   2. Backend is not deployed or not running');
    console.log('   3. Network connectivity issues');
  }
  
  console.log('\n📋 Summary:');
  console.log('============');
  console.log('If Super Admin login is failing, follow these steps:');
  console.log('1. Set environment variables in Railway dashboard');
  console.log('2. Redeploy the application');
  console.log('3. Run the fix-production-super-user.cjs script if needed');
  console.log('4. Test again with this script');
}

// Check if Railway URL is provided
if (process.argv.length < 3) {
  console.log('Usage: node test-production-api.cjs <RAILWAY_URL>');
  console.log('Example: node test-production-api.cjs https://your-backend.railway.app');
  process.exit(1);
}

process.env.RAILWAY_URL = process.argv[2];
testProductionAPI();
