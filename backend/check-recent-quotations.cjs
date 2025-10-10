const mongoose = require('mongoose');

async function checkRecentQuotations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Get quotations from the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentQuotations = await Quotation.find({
      createdAt: { $gte: tenMinutesAgo }
    }).sort({ createdAt: -1 });
    
    console.log('📋 Recent quotations (last 10 minutes):');
    console.log('📊 Count:', recentQuotations.length);
    
    recentQuotations.forEach((quotation, index) => {
      console.log(`\n${index + 1}. Quotation ID: ${quotation.quotationId}`);
      console.log(`   Customer: ${quotation.customerName}`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Total Price: ₹${quotation.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Sales User: ${quotation.salesUserName}`);
      console.log(`   Created: ${quotation.createdAt}`);
      console.log(`   Exact Pricing: ${!!quotation.exactPricingBreakdown}`);
      console.log(`   Exact Specs: ${!!quotation.exactProductSpecs}`);
    });
    
    if (recentQuotations.length === 0) {
      console.log('❌ No recent quotations found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkRecentQuotations().catch(console.error);
