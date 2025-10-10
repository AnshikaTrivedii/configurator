const mongoose = require('mongoose');

async function checkAllDatabases() {
  try {
    console.log('🔍 Checking all databases...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to configurator database');
    
    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    
    console.log('📊 Available databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Check configurator database collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Collections in configurator database:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    // Check quotations collection
    const { default: Quotation } = await import('./models/Quotation.js');
    const count = await Quotation.countDocuments();
    console.log(`\n📊 Total quotations in collection: ${count}`);
    
    // Check recent quotations
    const recentQuotations = await Quotation.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Recent quotations:');
    recentQuotations.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.quotationId} - ${q.customerName} (${q.createdAt})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllDatabases().catch(console.error);
