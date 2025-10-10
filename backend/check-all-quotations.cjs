const mongoose = require('mongoose');

async function checkAllQuotations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Get all quotations
    const allQuotations = await Quotation.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log('📋 All quotations (latest 10):');
    console.log('📊 Total count:', allQuotations.length);
    
    allQuotations.forEach((quotation, index) => {
      console.log(`\n${index + 1}. Quotation ID: ${quotation.quotationId}`);
      console.log(`   Customer: ${quotation.customerName}`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Total Price: ₹${quotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${quotation.salesUserName}`);
      console.log(`   Created: ${quotation.createdAt}`);
      console.log(`   Updated: ${quotation.updatedAt}`);
      console.log(`   Exact Pricing: ${!!quotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!quotation.exactProductSpecs}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllQuotations().catch(console.error);
