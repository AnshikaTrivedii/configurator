#!/usr/bin/env node

/**
 * Deployment Test Script
 * 
 * This script helps you test if your deployment is working correctly.
 * Run this script to check your backend API and database connection.
 */

const https = require('https');
const http = require('http');

// Configuration - Update these with your actual URLs
const BACKEND_URL = process.env.BACKEND_URL || 'https://configurator-vhsy.onrender.com';
const TEST_EMAIL = 'anshika.trivedi@orion-led.com';
const TEST_PASSWORD = 'Orion@123';

console.log('🔍 Testing Deployment...\n');

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1️⃣ Testing Backend Health Check...');
  
  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/health`;
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status === 'ok') {
            console.log('✅ Backend is healthy');
            resolve(true);
          } else {
            console.log('❌ Backend health check failed:', response);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Invalid JSON response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Backend not reachable:', error.message);
      console.log('   Make sure your backend is deployed and running');
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Backend request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Login Test
async function testLogin() {
  console.log('\n2️⃣ Testing Sales Login...');
  
  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/api/sales/login`;
    const client = url.startsWith('https') ? https : http;
    
    const postData = JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.token) {
            console.log('✅ Login successful');
            console.log(`   User: ${response.user.name} (${response.user.email})`);
            console.log(`   Role: ${response.user.role}`);
            resolve(true);
          } else {
            console.log('❌ Login failed:', response.message);
            console.log('   This usually means:');
            console.log('   - User not found in database');
            console.log('   - Wrong password');
            console.log('   - Database not seeded');
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Invalid JSON response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Login request failed:', error.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Login request timeout');
      req.destroy();
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 3: Quote Endpoint Test
async function testQuoteEndpoint() {
  console.log('\n3️⃣ Testing Quote Endpoint...');
  
  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/api/email/quota`;
    const client = url.startsWith('https') ? https : http;
    
    const testData = JSON.stringify({
      customerName: 'Test Customer',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      userType: 'endUser',
      totalPrice: 1000
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
      }
    };
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ Quote endpoint is working');
            resolve(true);
          } else {
            console.log('❌ Quote endpoint failed:', response.message);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Invalid JSON response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Quote endpoint test failed:', error.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Quote endpoint test timeout');
      req.destroy();
      resolve(false);
    });
    
    req.write(testData);
    req.end();
  });
}

// Test 4: CORS Test
async function testCORS() {
  console.log('\n4️⃣ Testing CORS Configuration...');
  
  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/api/sales/profile`;
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      method: 'GET',
      headers: {
        'Origin': 'https://your-frontend-url.com',
        'Access-Control-Request-Method': 'GET'
      }
    };
    
    const req = client.request(url, options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      if (corsHeader) {
        console.log('✅ CORS is configured');
        console.log(`   Allowed origins: ${corsHeader}`);
        resolve(true);
      } else {
        console.log('⚠️  CORS headers not found (might be OK for some deployments)');
        resolve(true);
      }
    });
    
    req.on('error', (error) => {
      console.log('❌ CORS test failed:', error.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ CORS test timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log(`Testing backend at: ${BACKEND_URL}\n`);
  
  const healthOk = await testHealthCheck();
  const loginOk = await testLogin();
  const quoteOk = await testQuoteEndpoint();
  const corsOk = await testCORS();
  
  console.log('\n📊 Test Results:');
  console.log(`   Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`   Login Test: ${loginOk ? '✅' : '❌'}`);
  console.log(`   Quote Endpoint: ${quoteOk ? '✅' : '❌'}`);
  console.log(`   CORS Test: ${corsOk ? '✅' : '❌'}`);
  
  if (healthOk && loginOk && quoteOk) {
    console.log('\n🎉 Your deployment is working correctly!');
    console.log('   Both "API endpoint not found" and "Invalid email or password" errors should be resolved.');
  } else {
    console.log('\n🔧 Issues found. Please check:');
    if (!healthOk) {
      console.log('   - Backend deployment and environment variables');
    }
    if (!loginOk) {
      console.log('   - Database connection and user seeding');
      console.log('   - Run: npm run seed (in your backend deployment)');
    }
    if (!quoteOk) {
      console.log('   - Quote endpoint configuration');
      console.log('   - Make sure the /api/email/quota endpoint is deployed');
    }
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Make sure VITE_API_URL is set in your frontend deployment');
  console.log('   2. Test the login in your frontend application');
  console.log('   3. Test quote submission functionality');
  console.log('   4. Check browser console for any remaining errors');
}

// Run the tests
runTests().catch(console.error);
