const mongoose = require('mongoose');

async function checkDebugQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the debug test quotation
    const debugQuotation = await Quotation.findOne({ quotationId: 'DEBUG-TEST-1760081953' });
    
    if (debugQuotation) {
      console.log('✅ DEBUG QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${debugQuotation.quotationId}`);
      console.log(`   Customer: ${debugQuotation.customerName}`);
      console.log(`   Product: ${debugQuotation.productName}`);
      console.log(`   Total Price: ₹${debugQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${debugQuotation.salesUserName}`);
      console.log(`   Created: ${debugQuotation.createdAt}`);
      console.log(`   Exact Pricing: ${!!debugQuotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!debugQuotation.exactProductSpecs}`);
      
      if (debugQuotation.exactPricingBreakdown) {
        console.log('   📊 Exact Pricing Breakdown:');
        console.log(`      Unit Price: ₹${debugQuotation.exactPricingBreakdown.unitPrice}`);
        console.log(`      Quantity: ${debugQuotation.exactPricingBreakdown.quantity}`);
        console.log(`      Grand Total: ₹${debugQuotation.exactPricingBreakdown.grandTotal}`);
      }
    } else {
      console.log('❌ DEBUG QUOTATION NOT FOUND IN DATABASE');
      
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

checkDebugQuotation().catch(console.error);
