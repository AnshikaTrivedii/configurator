const mongoose = require('mongoose');

async function debugDatabase() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
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
    
    // Count total quotations
    const totalCount = await Quotation.countDocuments();
    console.log(`📊 Total quotations in database: ${totalCount}`);
    
    // Get all quotations from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentQuotations = await Quotation.find({
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Quotations from last 24 hours: ${recentQuotations.length}`);
    
    if (recentQuotations.length > 0) {
      console.log('\n📋 Recent quotations:');
      recentQuotations.forEach((q, index) => {
        console.log(`   ${index + 1}. ${q.quotationId} - ${q.productName} - ₹${q.totalPrice} - ${q.createdAt}`);
      });
    }
    
    // Get latest 5 quotations regardless of date
    const latestQuotations = await Quotation.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Latest 5 quotations:');
    latestQuotations.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.quotationId} - ${q.productName} - ₹${q.totalPrice} - ${q.createdAt}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

debugDatabase().catch(console.error);
