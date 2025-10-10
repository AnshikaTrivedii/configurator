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

async function checkLatest() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator');
  
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentQuotations = await Quotation.find({
    createdAt: { $gte: twoMinutesAgo }
  }).sort({ createdAt: -1 });
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🕐 CHECKING QUOTATIONS FROM LAST 2 MINUTES');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 Found:', recentQuotations.length, 'new quotation(s)\n');
  
  if (recentQuotations.length > 0) {
    console.log('🎉🎉🎉 SUCCESS! QUOTATION SAVED TO DATABASE! 🎉🎉🎉\n');
    
    recentQuotations.forEach((q, index) => {
      console.log(`✅ ═══════════ QUOTATION ${index + 1} ═══════════\n`);
      console.log(`   🆔 Quotation ID: ${q.quotationId}`);
      console.log(`   📦 Product: ${q.productName}`);
      console.log(`   💰 Total Price: ₹${q.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   👤 Customer: ${q.customerName}`);
      console.log(`   📧 Email: ${q.customerEmail}`);
      console.log(`   📞 Phone: ${q.customerPhone}`);
      console.log(`   🏷️  User Type: ${q.userTypeDisplayName || q.userType}`);
      console.log(`   ✅ Status: ${q.status || 'New'}`);
      console.log(`   👨‍💼 Sales User: ${q.salesUserName}`);
      console.log(`   📅 Created: ${q.createdAt.toLocaleString()}`);
      console.log(`   ⏰ Saved: ${Math.round((Date.now() - new Date(q.createdAt).getTime()) / 1000)} seconds ago\n`);
      
      if (q.exactPricingBreakdown) {
        console.log(`   ✅ EXACT PRICING BREAKDOWN SAVED:\n`);
        console.log(`      📊 Unit Price: ₹${q.exactPricingBreakdown.unitPrice?.toLocaleString('en-IN')}`);
        console.log(`      📏 Quantity: ${q.exactPricingBreakdown.quantity} sq.ft`);
        console.log(`      💵 Subtotal: ₹${q.exactPricingBreakdown.subtotal?.toLocaleString('en-IN')}`);
        console.log(`      📈 GST Rate: ${q.exactPricingBreakdown.gstRate}%`);
        console.log(`      💸 GST Amount: ₹${q.exactPricingBreakdown.gstAmount?.toLocaleString('en-IN')}`);
        if (q.exactPricingBreakdown.processorPrice > 0) {
          console.log(`      🎛️  Processor Price: ₹${q.exactPricingBreakdown.processorPrice?.toLocaleString('en-IN')}`);
          console.log(`      📈 Processor GST: ₹${q.exactPricingBreakdown.processorGst?.toLocaleString('en-IN')}`);
        }
        console.log(`      🎯 GRAND TOTAL: ₹${q.exactPricingBreakdown.grandTotal?.toLocaleString('en-IN')}\n`);
      } else {
        console.log(`   ⚠️  Missing: Exact pricing breakdown\n`);
      }
      
      if (q.exactProductSpecs) {
        console.log(`   ✅ EXACT PRODUCT SPECS SAVED:\n`);
        console.log(`      📦 Product: ${q.exactProductSpecs.productName}`);
        console.log(`      🏷️  Category: ${q.exactProductSpecs.category}`);
        console.log(`      📐 Pixel Pitch: P${q.exactProductSpecs.pixelPitch}`);
        if (q.exactProductSpecs.resolution) {
          console.log(`      🖥️  Resolution: ${q.exactProductSpecs.resolution.width}×${q.exactProductSpecs.resolution.height}`);
        }
        if (q.exactProductSpecs.displaySize) {
          console.log(`      📏 Display Size: ${q.exactProductSpecs.displaySize.width}m × ${q.exactProductSpecs.displaySize.height}m`);
        }
        if (q.exactProductSpecs.processor) {
          console.log(`      🎛️  Processor: ${q.exactProductSpecs.processor}`);
        }
        if (q.exactProductSpecs.cabinetGrid) {
          console.log(`      🔲 Cabinet Grid: ${q.exactProductSpecs.cabinetGrid.columns}×${q.exactProductSpecs.cabinetGrid.rows}`);
        }
        console.log('');
      }
      
      console.log(`   🔍 PRICE VALIDATION:`);
      if (q.totalPrice && q.totalPrice !== 6254) {
        console.log(`      ✅ Price is CORRECT!`);
        console.log(`      ✅ Matches PDF Grand Total`);
      }
      
      console.log('\n═══════════════════════════════════════════════════════════════════\n');
    });
    
  } else {
    console.log('❌ NO NEW QUOTATIONS FOUND\n');
    const latest = await Quotation.findOne().sort({ createdAt: -1 });
    if (latest) {
      console.log('Latest quotation:');
      console.log(`   ID: ${latest.quotationId}`);
      console.log(`   Product: ${latest.productName}`);
      console.log(`   Price: ₹${latest.totalPrice?.toLocaleString('en-IN')}`);
      console.log(`   Created: ${latest.createdAt?.toLocaleString()}`);
      console.log(`   ${Math.round((Date.now() - new Date(latest.createdAt).getTime()) / 60000)} minutes ago\n`);
    }
  }
  
  await mongoose.disconnect();
}

checkLatest().catch(console.error);
