const mongoose = require('mongoose');

async function checkSimpleTestQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the simple test quotation
    const simpleTestQuotation = await Quotation.findOne({ quotationId: 'SIMPLE-TEST-1760082638' });
    
    if (simpleTestQuotation) {
      console.log('✅ SIMPLE TEST QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${simpleTestQuotation.quotationId}`);
      console.log(`   Customer: ${simpleTestQuotation.customerName}`);
      console.log(`   Product: ${simpleTestQuotation.productName}`);
      console.log(`   Total Price: ₹${simpleTestQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${simpleTestQuotation.salesUserName}`);
      console.log(`   Created: ${simpleTestQuotation.createdAt}`);
    } else {
      console.log('❌ SIMPLE TEST QUOTATION NOT FOUND IN DATABASE');
      
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

checkSimpleTestQuotation().catch(console.error);
