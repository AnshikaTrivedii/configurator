const mongoose = require('mongoose');

async function testDirectSave() {
  try {
    console.log('🔍 Testing direct database save...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
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
    
    // Try to save a quotation with the same structure as the API
    const testQuotation = new Quotation({
      quotationId: 'DIRECT-TEST-' + Date.now(),
      salesUserId: new mongoose.Types.ObjectId(),
      salesUserName: 'Direct Test User',
      customerName: 'Direct Test Customer',
      customerEmail: 'direct@test.com',
      customerPhone: '9876543210',
      productName: 'Direct Test Product',
      productDetails: { test: true },
      message: 'Direct test quotation',
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
        processorPrice: 0,
        processorGst: 0,
        grandTotal: 118000
      },
      exactProductSpecs: {
        productName: 'Direct Test Product',
        category: 'Direct Test',
        pixelPitch: 1.0
      }
    });
    
    console.log('📝 Attempting to save quotation...');
    await testQuotation.save();
    console.log('✅ DIRECT SAVE SUCCESS!');
    console.log('📊 Saved quotation ID:', testQuotation.quotationId);
    console.log('💰 Price:', testQuotation.totalPrice);
    console.log('📅 Created:', testQuotation.createdAt);
    
    // Clean up
    await Quotation.deleteOne({ quotationId: testQuotation.quotationId });
    console.log('🗑️  Cleaned up test quotation');
    
  } catch (error) {
    console.error('❌ DIRECT SAVE FAILED:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDirectSave().catch(console.error);
