const mongoose = require('mongoose');

// Test if we can manually save a quotation
async function testSave() {
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
  
  // Create a test quotation
  const testQuotation = new Quotation({
    quotationId: 'TEST/2025/10/10/MANUAL/999999',
    salesUserId: new mongoose.Types.ObjectId(),
    salesUserName: 'Test User',
    customerName: 'Test Customer',
    customerEmail: 'test@test.com',
    customerPhone: '1234567890',
    productName: 'Test Product',
    productDetails: { test: true },
    message: 'Manual test quotation',
    userType: 'endUser',
    userTypeDisplayName: 'End Customer',
    status: 'New',
    totalPrice: 100000,
    exactPricingBreakdown: {
      unitPrice: 9800,
      quantity: 10,
      subtotal: 98000,
      gstRate: 18,
      gstAmount: 17640,
      processorPrice: 0,
      processorGst: 0,
      grandTotal: 115640
    },
    exactProductSpecs: {
      productName: 'Test Product',
      category: 'Test',
      pixelPitch: 1.5
    }
  });
  
  try {
    await testQuotation.save();
    console.log('✅ TEST PASSED: Can save quotations to database');
    console.log('📊 Saved test quotation:', testQuotation.quotationId);
    
    // Delete test quotation
    await Quotation.deleteOne({ quotationId: testQuotation.quotationId });
    console.log('🗑️  Cleaned up test quotation');
    
  } catch (error) {
    console.error('❌ TEST FAILED: Cannot save to database');
    console.error('Error:', error.message);
  }
  
  await mongoose.disconnect();
}

testSave().catch(console.error);
