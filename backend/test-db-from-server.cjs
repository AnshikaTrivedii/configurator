const mongoose = require('mongoose');

async function testDbFromServer() {
  try {
    console.log('🔍 Testing database connection from server perspective...');
    
    // Use the same connection string as the server
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Test creating a quotation
    const testQuotation = new Quotation({
      quotationId: 'SERVER-PERSPECTIVE-TEST-' + Date.now(),
      salesUserId: new mongoose.Types.ObjectId(),
      salesUserName: 'Server Test User',
      customerName: 'Server Test Customer',
      customerEmail: 'server@test.com',
      customerPhone: '9876543210',
      productName: 'Server Test Product',
      productDetails: { test: true },
      message: 'Server test',
      userType: 'endUser',
      userTypeDisplayName: 'Server Test User',
      status: 'New',
      totalPrice: 900000
    });
    
    console.log('💾 Attempting to save quotation...');
    await testQuotation.save();
    
    console.log('✅ SERVER PERSPECTIVE TEST SUCCESSFUL!');
    console.log(`   Quotation ID: ${testQuotation.quotationId}`);
    console.log(`   MongoDB ID: ${testQuotation._id}`);
    console.log(`   Total Price: ₹${testQuotation.totalPrice}`);
    
    // Verify it was saved
    const savedQuotation = await Quotation.findById(testQuotation._id);
    console.log('🔍 Verification - Quotation found:', !!savedQuotation);
    
    // Clean up
    await Quotation.deleteOne({ _id: testQuotation._id });
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Server perspective test failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDbFromServer().catch(console.error);
