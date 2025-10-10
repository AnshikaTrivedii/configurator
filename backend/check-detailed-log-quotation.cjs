const mongoose = require('mongoose');

async function checkDetailedLogQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the detailed log test quotation
    const detailedLogQuotation = await Quotation.findOne({ quotationId: 'DETAILED-LOG-TEST-1760082722' });
    
    if (detailedLogQuotation) {
      console.log('✅ DETAILED LOG TEST QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${detailedLogQuotation.quotationId}`);
      console.log(`   Customer: ${detailedLogQuotation.customerName}`);
      console.log(`   Product: ${detailedLogQuotation.productName}`);
      console.log(`   Total Price: ₹${detailedLogQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${detailedLogQuotation.salesUserName}`);
      console.log(`   Created: ${detailedLogQuotation.createdAt}`);
      console.log(`   Exact Pricing: ${!!detailedLogQuotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!detailedLogQuotation.exactProductSpecs}`);
    } else {
      console.log('❌ DETAILED LOG TEST QUOTATION NOT FOUND IN DATABASE');
      
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

checkDetailedLogQuotation().catch(console.error);
