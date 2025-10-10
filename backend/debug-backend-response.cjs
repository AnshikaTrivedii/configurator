const mongoose = require('mongoose');

// First, let's create a valid user token by logging in
async function debugBackendResponse() {
  try {
    console.log('🔍 Testing backend API response...');
    
    // Test the health endpoint
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test login endpoint to get a valid token
    console.log('\n🔑 Testing login endpoint...');
    const loginResponse = await fetch('http://localhost:3001/api/sales/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('📋 Login response:', loginData);
    
    if (loginData.success && loginData.token) {
      console.log('✅ Got valid token, testing save endpoint...');
      
      // Test save endpoint with valid token
      const saveResponse = await fetch('http://localhost:3001/api/sales/quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          quotationId: 'API-TEST-' + Date.now(),
          customerName: 'API Test Customer',
          customerEmail: 'api@test.com',
          customerPhone: '9876543210',
          productName: 'API Test Product',
          productDetails: { test: true },
          message: 'API test quotation',
          userType: 'endUser',
          userTypeDisplayName: 'End Customer',
          status: 'New',
          totalPrice: 200000,
          exactPricingBreakdown: {
            unitPrice: 10000,
            quantity: 20,
            subtotal: 200000,
            gstRate: 18,
            gstAmount: 36000,
            grandTotal: 236000
          },
          exactProductSpecs: {
            productName: 'API Test Product',
            category: 'API Test',
            pixelPitch: 1.5
          }
        })
      });
      
      const saveData = await saveResponse.json();
      console.log('📋 Save response:', saveData);
      console.log('📊 Response status:', saveResponse.status);
      
      if (saveData.success) {
        console.log('✅ API returned success');
        
        // Check if it was actually saved
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator');
        
        const quotationSchema = new mongoose.Schema({
          quotationId: String,
          salesUserId: String,
          salesUserName: String,
          customerName: String,
          customerEmail: String,
          customerPhone: String,
          productName: String,
          productDetails: Object,
          message: String,
          userType: String,
          userTypeDisplayName: String,
          status: String,
          totalPrice: Number,
          exactPricingBreakdown: Object,
          exactProductSpecs: Object,
          quotationData: Object,
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        });
        
        const Quotation = mongoose.model('Quotation', quotationSchema);
        
        const savedQuotation = await Quotation.findOne({ 
          quotationId: saveData.quotationId 
        });
        
        if (savedQuotation) {
          console.log('✅ QUOTATION WAS ACTUALLY SAVED TO DATABASE!');
          console.log('📊 Quotation ID:', savedQuotation.quotationId);
          console.log('💰 Price:', savedQuotation.totalPrice);
          console.log('📅 Created:', savedQuotation.createdAt);
          
          // Clean up
          await Quotation.deleteOne({ quotationId: savedQuotation.quotationId });
          console.log('🗑️  Cleaned up test quotation');
        } else {
          console.log('❌ QUOTATION WAS NOT SAVED TO DATABASE!');
          console.log('❌ Backend returned success but no database record found');
        }
        
        await mongoose.disconnect();
      } else {
        console.log('❌ API returned error:', saveData.message);
      }
    } else {
      console.log('❌ Could not get valid token:', loginData.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

debugBackendResponse().catch(console.error);
