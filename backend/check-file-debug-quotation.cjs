const mongoose = require('mongoose');

async function checkFileDebugQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the file debug test quotation
    const fileDebugQuotation = await Quotation.findOne({ quotationId: 'FILE-DEBUG-TEST-1760082766' });
    
    if (fileDebugQuotation) {
      console.log('✅ FILE DEBUG TEST QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${fileDebugQuotation.quotationId}`);
      console.log(`   Customer: ${fileDebugQuotation.customerName}`);
      console.log(`   Product: ${fileDebugQuotation.productName}`);
      console.log(`   Total Price: ₹${fileDebugQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${fileDebugQuotation.salesUserName}`);
      console.log(`   Created: ${fileDebugQuotation.createdAt}`);
      console.log(`   Exact Pricing: ${!!fileDebugQuotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!fileDebugQuotation.exactProductSpecs}`);
    } else {
      console.log('❌ FILE DEBUG TEST QUOTATION NOT FOUND IN DATABASE');
      
      // Check the latest quotation
      const latestQuotation = await Quotation.findOne({}).sort({ createdAt: -1 });
      if (latestQuotation) {
        console.log('📋 Latest quotation in database:');
        console.log(`   ID: ${latestQuotation.quotationId}`);
        console.log(`   Created: ${latestQuotation.createdAt}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkFileDebugQuotation().catch(console.error);
