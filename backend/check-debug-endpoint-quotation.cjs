const mongoose = require('mongoose');

async function checkDebugEndpointQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the debug endpoint test quotation
    const debugEndpointQuotation = await Quotation.findOne({ quotationId: 'DEBUG-ENDPOINT-TEST-1760082094' });
    
    if (debugEndpointQuotation) {
      console.log('✅ DEBUG ENDPOINT TEST QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${debugEndpointQuotation.quotationId}`);
      console.log(`   Customer: ${debugEndpointQuotation.customerName}`);
      console.log(`   Product: ${debugEndpointQuotation.productName}`);
      console.log(`   Total Price: ₹${debugEndpointQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${debugEndpointQuotation.salesUserName}`);
      console.log(`   Created: ${debugEndpointQuotation.createdAt}`);
    } else {
      console.log('❌ DEBUG ENDPOINT TEST QUOTATION NOT FOUND IN DATABASE');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDebugEndpointQuotation().catch(console.error);
