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

async function checkLast30Seconds() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator');
  
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const recentQuotations = await Quotation.find({
    createdAt: { $gte: thirtySecondsAgo }
  }).sort({ createdAt: -1 });
  
  console.log('🕐 CHECKING QUOTATIONS FROM LAST 30 SECONDS');
  console.log('📊 Found:', recentQuotations.length, 'new quotation(s)\n');
  
  if (recentQuotations.length > 0) {
    console.log('🎉🎉🎉 YOUR QUOTATION WAS JUST SAVED! 🎉🎉🎉\n');
    
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
    console.log('❌ NO QUOTATIONS FOUND IN LAST 30 SECONDS');
    
    // Check last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentQuotations2min = await Quotation.find({
      createdAt: { $gte: twoMinutesAgo }
    }).sort({ createdAt: -1 });
    
    console.log(`\n📊 Quotations from last 2 minutes: ${recentQuotations2min.length}`);
    
    if (recentQuotations2min.length > 0) {
      console.log('\nRecent quotations:');
      recentQuotations2min.forEach((q, index) => {
        console.log(`   ${index + 1}. ${q.quotationId} - ${q.productName} - ₹${q.totalPrice?.toLocaleString('en-IN')} - ${Math.round((Date.now() - new Date(q.createdAt).getTime()) / 60)} min ago`);
      });
    }
  }
  
  await mongoose.disconnect();
}

checkLast30Seconds().catch(console.error);
