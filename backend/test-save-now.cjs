const mongoose = require('mongoose');

async function testSaveNow() {
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
  
  // Create a test quotation with exact data
  const testQuotation = new Quotation({
    quotationId: 'FRESH-TEST-' + Date.now(),
    salesUserId: new mongoose.Types.ObjectId(),
    salesUserName: 'Fresh Test User',
    customerName: 'Fresh Test Customer',
    customerEmail: 'fresh@test.com',
    customerPhone: '9876543210',
    productName: 'Fresh Test Product',
    productDetails: { test: true, fresh: true },
    message: 'Fresh test quotation with exact data',
    userType: 'endUser',
    userTypeDisplayName: 'End Customer',
    status: 'New',
    totalPrice: 500000,  // Correct price, not fallback
    exactPricingBreakdown: {
      unitPrice: 10000,
      quantity: 50,
      subtotal: 500000,
      gstRate: 18,
      gstAmount: 90000,
      processorPrice: 0,
      processorGst: 0,
      grandTotal: 590000
    },
    exactProductSpecs: {
      productName: 'Fresh Test Product',
      category: 'Fresh Test',
      pixelPitch: 2.5
    }
  });
  
  try {
    await testQuotation.save();
    console.log('✅ FRESH TEST PASSED: New quotation saved successfully');
    console.log('📊 Quotation ID:', testQuotation.quotationId);
    console.log('💰 Price:', testQuotation.totalPrice);
    console.log('📅 Created:', testQuotation.createdAt);
    
    // Don't delete this one - let it stay for verification
    
  } catch (error) {
    console.error('❌ FRESH TEST FAILED:', error.message);
  }
  
  await mongoose.disconnect();
}

testSaveNow().catch(console.error);
