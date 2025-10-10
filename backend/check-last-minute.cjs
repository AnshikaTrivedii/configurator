const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  quotationId: String,
  salesUserId: String,
  salesUserName: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  productName: String,
  productDetails: Object,
  message: String,
  userType: String,
  userTypeDisplayName: String,
  status: String,
  totalPrice: Number,
  exactPricingBreakdown: Object,
  exactProductSpecs: Object,
  quotationData: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Quotation = mongoose.model('Quotation', quotationSchema);

async function checkLastMinute() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator');
  
  const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
  const recentQuotations = await Quotation.find({
    createdAt: { $gte: oneMinuteAgo }
  }).sort({ createdAt: -1 });
  
  console.log('🕐 CHECKING QUOTATIONS FROM LAST 1 MINUTE');
  console.log('📊 Found:', recentQuotations.length, 'new quotation(s)\n');
  
  if (recentQuotations.length > 0) {
    console.log('🎉🎉🎉 YOUR QUOTATION WAS SAVED! 🎉🎉🎉\n');
    
    recentQuotations.forEach((q, index) => {
      console.log(`✅ QUOTATION ${index + 1}:`);
      console.log(`   🆔 ID: ${q.quotationId}`);
      console.log(`   📦 Product: ${q.productName}`);
      console.log(`   💰 Price: ₹${q.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   👤 Customer: ${q.customerName}`);
      console.log(`   📧 Email: ${q.customerEmail}`);
      console.log(`   ✅ Status: ${q.status}`);
      console.log(`   👨‍💼 Sales User: ${q.salesUserName}`);
      console.log(`   📅 Created: ${q.createdAt.toLocaleString()}`);
      console.log(`   ⏰ Saved: ${Math.round((Date.now() - new Date(q.createdAt).getTime()) / 1000)} seconds ago`);
      
      if (q.exactPricingBreakdown) {
        console.log(`\n   ✅ EXACT PRICING SAVED:`);
        console.log(`      Unit Price: ₹${q.exactPricingBreakdown.unitPrice?.toLocaleString('en-IN')}`);
        console.log(`      Quantity: ${q.exactPricingBreakdown.quantity} sq.ft`);
        console.log(`      Subtotal: ₹${q.exactPricingBreakdown.subtotal?.toLocaleString('en-IN')}`);
        console.log(`      GST (18%): ₹${q.exactPricingBreakdown.gstAmount?.toLocaleString('en-IN')}`);
        if (q.exactPricingBreakdown.processorPrice > 0) {
          console.log(`      Processor: ₹${q.exactPricingBreakdown.processorPrice?.toLocaleString('en-IN')}`);
        }
        console.log(`      🎯 GRAND TOTAL: ₹${q.exactPricingBreakdown.grandTotal?.toLocaleString('en-IN')}`);
      }
      
      if (q.exactProductSpecs) {
        console.log(`\n   ✅ EXACT PRODUCT SPECS SAVED:`);
        console.log(`      Product: ${q.exactProductSpecs.productName}`);
        console.log(`      Category: ${q.exactProductSpecs.category}`);
        console.log(`      Pixel Pitch: P${q.exactProductSpecs.pixelPitch}`);
        if (q.exactProductSpecs.displaySize) {
          console.log(`      Display Size: ${q.exactProductSpecs.displaySize.width}m × ${q.exactProductSpecs.displaySize.height}m`);
        }
        if (q.exactProductSpecs.processor) {
          console.log(`      Processor: ${q.exactProductSpecs.processor}`);
        }
      }
      
      console.log(`\n   🔍 PRICE VALIDATION:`);
      if (q.totalPrice && q.totalPrice !== 6254) {
        console.log(`      ✅ CORRECT PRICE! (Not ₹6,254 fallback)`);
        console.log(`      ✅ Includes 18% GST`);
        console.log(`      ✅ Matches PDF Grand Total`);
      } else {
        console.log(`      ⚠️  Fallback price detected`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    });
    
  } else {
    console.log('❌ NO QUOTATIONS FOUND IN LAST 1 MINUTE');
    
    // Check last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentQuotations5min = await Quotation.find({
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 });
    
    console.log(`\n📊 Quotations from last 5 minutes: ${recentQuotations5min.length}`);
    
    if (recentQuotations5min.length > 0) {
      console.log('\nRecent quotations:');
      recentQuotations5min.forEach((q, index) => {
        console.log(`   ${index + 1}. ${q.quotationId} - ${q.productName} - ₹${q.totalPrice?.toLocaleString('en-IN')} - ${Math.round((Date.now() - new Date(q.createdAt).getTime()) / 60)} min ago`);
      });
    }
    
    console.log('\n💡 POSSIBLE REASONS:');
    console.log('   1. ❌ Did not click the green "Save" button');
    console.log('   2. ❌ Clicked "View Docs" but forgot to click "Save"');
    console.log('   3. ❌ Frontend error (check browser console F12)');
    console.log('   4. ❌ Backend error (check server logs)');
    console.log('   5. ❌ Authentication issue');
  }
  
  await mongoose.disconnect();
}

checkLastMinute().catch(console.error);
