const mongoose = require('mongoose');

async function checkModelDebugQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the model debug test quotation
    const modelDebugQuotation = await Quotation.findOne({ quotationId: 'MODEL-DEBUG-TEST-1760082594' });
    
    if (modelDebugQuotation) {
      console.log('✅ MODEL DEBUG TEST QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${modelDebugQuotation.quotationId}`);
      console.log(`   Customer: ${modelDebugQuotation.customerName}`);
      console.log(`   Product: ${modelDebugQuotation.productName}`);
      console.log(`   Total Price: ₹${modelDebugQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${modelDebugQuotation.salesUserName}`);
      console.log(`   Created: ${modelDebugQuotation.createdAt}`);
      console.log(`   Exact Pricing: ${!!modelDebugQuotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!modelDebugQuotation.exactProductSpecs}`);
    } else {
      console.log('❌ MODEL DEBUG TEST QUOTATION NOT FOUND IN DATABASE');
      
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

checkModelDebugQuotation().catch(console.error);
