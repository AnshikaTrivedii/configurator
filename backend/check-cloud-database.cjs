const mongoose = require('mongoose');

async function checkCloudDatabase() {
  try {
    console.log('🔍 Checking cloud database...');
    
    // Connect to the same database the server is using
    await mongoose.connect('mongodb+srv://orionconfigurator:orionconfigurator123@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority');
    console.log('✅ Connected to cloud database');
    
    const { default: Quotation } = await import('./models/Quotation.js');
    
    // Check total quotations
    const count = await Quotation.countDocuments();
    console.log(`📊 Total quotations in cloud database: ${count}`);
    
    // Check recent quotations
    const recentQuotations = await Quotation.find({}).sort({ createdAt: -1 }).limit(10);
    console.log('\n📋 Recent quotations in cloud database:');
    recentQuotations.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.quotationId} - ${q.customerName} (${q.createdAt})`);
    });
    
    // Look for our test quotations
    const testQuotations = await Quotation.find({ 
      quotationId: { $regex: /^.*-TEST-/ } 
    }).sort({ createdAt: -1 });
    
    console.log('\n🧪 Test quotations found:');
    testQuotations.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.quotationId} - ${q.customerName} (${q.createdAt})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkCloudDatabase().catch(console.error);
