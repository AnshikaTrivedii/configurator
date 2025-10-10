const fetch = require('node-fetch');

async function testApiCall() {
  try {
    console.log('🔍 Testing API call from frontend perspective...');
    
    // Test the exact API call the frontend would make
    const response = await fetch('http://localhost:3001/api/sales/quotation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({
        quotationId: 'TEST-API-CALL-123',
        customerName: 'Test Customer',
        customerEmail: 'test@test.com',
        customerPhone: '9876543210',
        productName: 'Test Product',
        productDetails: { test: true },
        message: 'Test message',
        userType: 'endUser',
        userTypeDisplayName: 'End Customer',
        status: 'New',
        totalPrice: 100000,
        exactPricingBreakdown: {
          unitPrice: 5000,
          quantity: 20,
          subtotal: 100000,
          gstRate: 18,
          gstAmount: 18000,
          grandTotal: 118000
        },
        exactProductSpecs: {
          productName: 'Test Product',
          category: 'Test',
          pixelPitch: 1.0
        }
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);
    
    const data = await response.json();
    console.log('📋 Response data:', data);
    
    if (response.ok) {
      console.log('✅ API call succeeded');
    } else {
      console.log('❌ API call failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ API call error:', error.message);
  }
}

testApiCall().catch(console.error);
