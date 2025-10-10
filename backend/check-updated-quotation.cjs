const mongoose = require('mongoose');

async function checkUpdatedQuotation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Look for the updated code test quotation
    const updatedQuotation = await Quotation.findOne({ quotationId: 'UPDATED-CODE-TEST-1760082013' });
    
    if (updatedQuotation) {
      console.log('✅ UPDATED CODE TEST QUOTATION FOUND IN DATABASE!');
      console.log(`   Quotation ID: ${updatedQuotation.quotationId}`);
      console.log(`   Customer: ${updatedQuotation.customerName}`);
      console.log(`   Product: ${updatedQuotation.productName}`);
      console.log(`   Total Price: ₹${updatedQuotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${updatedQuotation.salesUserName}`);
      console.log(`   Created: ${updatedQuotation.createdAt}`);
      console.log(`   Exact Pricing: ${!!updatedQuotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!updatedQuotation.exactProductSpecs}`);
      
      if (updatedQuotation.exactPricingBreakdown) {
        console.log('   📊 Exact Pricing Breakdown:');
        console.log(`      Unit Price: ₹${updatedQuotation.exactPricingBreakdown.unitPrice}`);
        console.log(`      Quantity: ${updatedQuotation.exactPricingBreakdown.quantity}`);
        console.log(`      Grand Total: ₹${updatedQuotation.exactPricingBreakdown.grandTotal}`);
      }
    } else {
      console.log('❌ UPDATED CODE TEST QUOTATION NOT FOUND IN DATABASE');
      
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

checkUpdatedQuotation().catch(console.error);
