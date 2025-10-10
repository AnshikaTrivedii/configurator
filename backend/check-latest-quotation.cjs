const mongoose = require('mongoose');

async function checkLatestQuotation() {
  try {
    console.log('🔍 Checking for the latest quotation...');
    
    // Connect to the same database the server is using
    await mongoose.connect('mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to cloud database');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Get the latest quotations from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentQuotations = await Quotation.find({
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Recent quotations (last 5 minutes): ${recentQuotations.length}`);
    
    if (recentQuotations.length > 0) {
      console.log('\n✅ RECENT QUOTATIONS FOUND:');
      recentQuotations.forEach((quotation, index) => {
        console.log(`\n${index + 1}. 📋 Quotation Details:`);
        console.log(`   🆔 Quotation ID: ${quotation.quotationId}`);
        console.log(`   👤 Customer: ${quotation.customerName}`);
        console.log(`   📧 Email: ${quotation.customerEmail}`);
        console.log(`   📱 Phone: ${quotation.customerPhone}`);
        console.log(`   🏷️ Product: ${quotation.productName}`);
        console.log(`   💰 Total Price: ₹${quotation.totalPrice?.toLocaleString('en-IN')}`);
        console.log(`   👨‍💼 Sales User: ${quotation.salesUserName}`);
        console.log(`   📅 Created: ${quotation.createdAt}`);
        console.log(`   📊 Status: ${quotation.status}`);
        console.log(`   📈 Exact Pricing Data: ${!!quotation.exactPricingBreakdown ? '✅ Yes' : '❌ No'}`);
        console.log(`   📋 Exact Product Specs: ${!!quotation.exactProductSpecs ? '✅ Yes' : '❌ No'}`);
        
        if (quotation.exactPricingBreakdown) {
          console.log(`   💵 Pricing Breakdown:`);
          console.log(`      Unit Price: ₹${quotation.exactPricingBreakdown.unitPrice?.toLocaleString('en-IN')}`);
          console.log(`      Quantity: ${quotation.exactPricingBreakdown.quantity}`);
          console.log(`      Subtotal: ₹${quotation.exactPricingBreakdown.subtotal?.toLocaleString('en-IN')}`);
          console.log(`      GST (18%): ₹${quotation.exactPricingBreakdown.gstAmount?.toLocaleString('en-IN')}`);
          console.log(`      Grand Total: ₹${quotation.exactPricingBreakdown.grandTotal?.toLocaleString('en-IN')}`);
        }
      });
    } else {
      console.log('❌ No recent quotations found in the last 5 minutes');
      
      // Check the very latest quotation regardless of time
      const latestQuotation = await Quotation.findOne({}).sort({ createdAt: -1 });
      if (latestQuotation) {
        console.log('\n📋 Latest quotation in database:');
        console.log(`   🆔 Quotation ID: ${latestQuotation.quotationId}`);
        console.log(`   👤 Customer: ${latestQuotation.customerName}`);
        console.log(`   💰 Total Price: ₹${latestQuotation.totalPrice?.toLocaleString('en-IN')}`);
        console.log(`   📅 Created: ${latestQuotation.createdAt}`);
        console.log(`   ⏰ Time since creation: ${Math.round((Date.now() - new Date(latestQuotation.createdAt).getTime()) / 1000 / 60)} minutes ago`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkLatestQuotation().catch(console.error);
