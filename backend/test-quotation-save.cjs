const mongoose = require('mongoose');

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Test quotation save process
async function testQuotationSave() {
  try {
    await connectToDatabase();
    
    console.log('🔍 Testing quotation save process...');
    
    // Test data that matches what frontend would send
    const testQuotationData = {
      quotationId: 'TEST-SAVE-' + Date.now(),
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '9876543210',
      productName: 'Test Product',
      productDetails: {
        productId: 'TEST-001',
        category: 'Test Category',
        pixelPitch: 1.0,
        resolution: { width: 1920, height: 1080 },
        cabinetDimensions: { width: 500, height: 500 },
        displaySize: { width: 2.4, height: 1.01 },
        aspectRatio: '16:9',
        processor: 'TB40',
        mode: 'indoor',
        cabinetGrid: { columns: 4, rows: 2 }
      },
      message: 'Test quotation message',
      userType: 'endUser',
      userTypeDisplayName: 'End Customer',
      status: 'New',
      totalPrice: 150000,
      exactPricingBreakdown: {
        unitPrice: 15000,
        quantity: 8,
        subtotal: 120000,
        gstRate: 18,
        gstAmount: 21600,
        processorPrice: 25000,
        processorGst: 4500,
        grandTotal: 150100
      },
      exactProductSpecs: {
        productName: 'Test Product',
        category: 'Test Category',
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
    
    console.log('📋 Test data prepared:', JSON.stringify(testQuotationData, null, 2));
    
    // Import the Quotation model (ES6 module)
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Create and save quotation
    console.log('💾 Creating quotation object...');
    const quotation = new Quotation({
      quotationId: testQuotationData.quotationId,
      salesUserId: new mongoose.Types.ObjectId(), // Mock sales user ID
      salesUserName: 'Test Sales User',
      customerName: testQuotationData.customerName,
      customerEmail: testQuotationData.customerEmail,
      customerPhone: testQuotationData.customerPhone,
      productName: testQuotationData.productName,
      productDetails: testQuotationData.productDetails,
      message: testQuotationData.message,
      userType: testQuotationData.userType,
      userTypeDisplayName: testQuotationData.userTypeDisplayName,
      status: testQuotationData.status,
      totalPrice: testQuotationData.totalPrice,
      exactPricingBreakdown: testQuotationData.exactPricingBreakdown,
      exactProductSpecs: testQuotationData.exactProductSpecs,
      quotationData: {
        exactPricingBreakdown: testQuotationData.exactPricingBreakdown,
        exactProductSpecs: testQuotationData.exactProductSpecs,
        createdAt: testQuotationData.createdAt,
        savedAt: new Date().toISOString()
      }
    });
    
    console.log('💾 Attempting to save quotation to database...');
    await quotation.save();
    
    console.log('✅ DATABASE SAVE TEST SUCCESSFUL!');
    console.log('🆔 Saved quotation ID:', quotation.quotationId);
    console.log('🆔 MongoDB document ID:', quotation._id);
    console.log('💰 Total price saved:', quotation.totalPrice);
    console.log('📊 Exact pricing breakdown saved:', !!quotation.exactPricingBreakdown);
    console.log('📊 Exact product specs saved:', !!quotation.exactProductSpecs);
    
    // Verify the data was saved correctly
    const savedQuotation = await Quotation.findById(quotation._id);
    console.log('🔍 Verification - Quotation found in database:', !!savedQuotation);
    console.log('🔍 Verification - Total price matches:', savedQuotation.totalPrice === testQuotationData.totalPrice);
    
    // Clean up test data
    await Quotation.deleteOne({ _id: quotation._id });
    console.log('🧹 Test data cleaned up');
    
    console.log('✅ ALL TESTS PASSED - Quotation save process is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testQuotationSave().catch(console.error);
