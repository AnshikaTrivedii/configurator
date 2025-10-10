const fetch = require('node-fetch');

async function testApiEndpoint() {
  try {
    console.log('🔍 Testing API endpoint with authentication...');
    
    // Step 1: Login to get a valid token
    console.log('🔑 Step 1: Getting authentication token...');
    const loginResponse = await fetch('http://localhost:3001/api/sales/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sales@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful, got token');
    
    // Step 2: Test the quotation save endpoint
    console.log('📤 Step 2: Testing quotation save endpoint...');
    
    const testQuotationData = {
      quotationId: 'API-TEST-' + Date.now(),
      customerName: 'API Test Customer',
      customerEmail: 'api@test.com',
      customerPhone: '9876543210',
      productName: 'API Test Product',
      productDetails: {
        productId: 'API-001',
        category: 'API Test Category',
        pixelPitch: 1.0,
        resolution: { width: 1920, height: 1080 },
        cabinetDimensions: { width: 500, height: 500 },
        displaySize: { width: 2.4, height: 1.01 },
        aspectRatio: '16:9',
        processor: 'TB40',
        mode: 'indoor',
        cabinetGrid: { columns: 4, rows: 2 }
      },
      message: 'API test quotation message',
      userType: 'endUser',
      userTypeDisplayName: 'End Customer',
      status: 'New',
      totalPrice: 200000,
      exactPricingBreakdown: {
        unitPrice: 20000,
        quantity: 8,
        subtotal: 160000,
        gstRate: 18,
        gstAmount: 28800,
        processorPrice: 25000,
        processorGst: 4500,
        grandTotal: 217300
      },
      exactProductSpecs: {
        productName: 'API Test Product',
        category: 'API Test Category',
        pixelPitch: 1.0,
        resolution: { width: 1920, height: 1080 },
        cabinetDimensions: { width: 500, height: 500 },
        displaySize: { width: 2.4, height: 1.01 },
        aspectRatio: '16:9',
        processor: 'TB40',
        mode: 'indoor',
        cabinetGrid: { columns: 4, rows: 2 }
      },
      createdAt: new Date().toISOString()
    };
    
    console.log('📋 Sending test data to API...');
    
    const saveResponse = await fetch('http://localhost:3001/api/sales/quotation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify(testQuotationData)
    });
    
    console.log('📊 Response status:', saveResponse.status);
    console.log('📊 Response ok:', saveResponse.ok);
    
    const saveData = await saveResponse.json();
    console.log('📋 Response data:', JSON.stringify(saveData, null, 2));
    
    if (saveResponse.ok) {
      console.log('✅ API ENDPOINT TEST SUCCESSFUL!');
      console.log('✅ Quotation saved with ID:', saveData.quotationId);
      console.log('✅ Total price saved:', saveData.quotationData.totalPrice);
      console.log('✅ Response format is correct');
    } else {
      console.log('❌ API ENDPOINT TEST FAILED!');
      console.log('❌ Error message:', saveData.message);
    }
    
  } catch (error) {
    console.error('❌ API test error:', error.message);
  }
}

// Run the test
testApiEndpoint().catch(console.error);
