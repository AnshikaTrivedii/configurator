const mongoose = require('mongoose');

async function testBackendSave() {
  try {
    console.log('🔍 Testing if backend is running latest code...');
    
    // Connect to database
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
    
    // Create a test quotation with the exact structure the API expects
    const testQuotation = new Quotation({
      quotationId: 'BACKEND-TEST-' + Date.now(),
      salesUserId: new mongoose.Types.ObjectId(),
      salesUserName: 'Backend Test User',
      customerName: 'Backend Test Customer',
      customerEmail: 'backend@test.com',
      customerPhone: '9876543210',
      productName: 'Backend Test Product',
      productDetails: { test: true },
      message: 'Backend test quotation',
      userType: 'endUser',
      userTypeDisplayName: 'End Customer',
      status: 'New',
      totalPrice: 300000,
      exactPricingBreakdown: {
        unitPrice: 15000,
        quantity: 20,
        subtotal: 300000,
        gstRate: 18,
        gstAmount: 54000,
        processorPrice: 0,
        processorGst: 0,
        grandTotal: 354000
      },
      exactProductSpecs: {
        productName: 'Backend Test Product',
        category: 'Backend Test',
        pixelPitch: 2.0
      },
      quotationData: {
        exactPricingBreakdown: {
          unitPrice: 15000,
          quantity: 20,
          subtotal: 300000,
          gstRate: 18,
          gstAmount: 54000,
          processorPrice: 0,
          processorGst: 0,
          grandTotal: 354000
        },
        exactProductSpecs: {
          productName: 'Backend Test Product',
          category: 'Backend Test',
          pixelPitch: 2.0
        },
        createdAt: new Date().toISOString(),
        savedAt: new Date().toISOString()
      }
    });
    
    console.log('📝 Attempting to save test quotation...');
    await testQuotation.save();
    console.log('✅ BACKEND TEST SAVE SUCCESS!');
    console.log('📊 Quotation ID:', testQuotation.quotationId);
    console.log('💰 Price:', testQuotation.totalPrice);
    console.log('📅 Created:', testQuotation.createdAt);
    
    // Verify it was saved
    const savedQuotation = await Quotation.findOne({ quotationId: testQuotation.quotationId });
    if (savedQuotation) {
      console.log('✅ VERIFIED: Quotation exists in database');
      console.log('✅ Has exactPricingBreakdown:', !!savedQuotation.exactPricingBreakdown);
      console.log('✅ Has exactProductSpecs:', !!savedQuotation.exactProductSpecs);
      console.log('✅ Has quotationData:', !!savedQuotation.quotationData);
    }
    
    // Clean up
    await Quotation.deleteOne({ quotationId: testQuotation.quotationId });
    console.log('🗑️  Cleaned up test quotation');
    
  } catch (error) {
    console.error('❌ BACKEND TEST FAILED:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testBackendSave().catch(console.error);
