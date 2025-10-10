const mongoose = require('mongoose');

async function testDbConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Test creating a quotation directly
    console.log('💾 Testing direct quotation creation...');
    
    const testQuotation = new Quotation({
      quotationId: 'DIRECT-TEST-' + Date.now(),
      salesUserId: new mongoose.Types.ObjectId(),
      salesUserName: 'Direct Test User',
      customerName: 'Direct Test Customer',
      customerEmail: 'direct@test.com',
      customerPhone: '9876543210',
      productName: 'Direct Test Product',
      productDetails: { test: true },
      message: 'Direct test',
      userType: 'endUser',
      userTypeDisplayName: 'End Customer',
      status: 'New',
      totalPrice: 500000,
      exactPricingBreakdown: {
        unitPrice: 50000,
        quantity: 10,
        grandTotal: 590000
      },
      exactProductSpecs: {
        productName: 'Direct Test Product'
      }
    });
    
    console.log('💾 Attempting to save quotation...');
    await testQuotation.save();
    
    console.log('✅ DIRECT SAVE SUCCESSFUL!');
    console.log(`   Quotation ID: ${testQuotation.quotationId}`);
    console.log(`   MongoDB ID: ${testQuotation._id}`);
    console.log(`   Total Price: ₹${testQuotation.totalPrice}`);
    
    // Clean up
    await Quotation.deleteOne({ _id: testQuotation._id });
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDbConnection().catch(console.error);
