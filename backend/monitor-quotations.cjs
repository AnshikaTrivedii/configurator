const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  quotationId: { type: String, required: true, unique: true },
  salesUserId: { type: String, required: true },
  salesUserName: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String },
  productName: { type: String, required: true },
  productDetails: { type: Object },
  message: { type: String },
  userType: { type: String },
  userTypeDisplayName: { type: String },
  status: { type: String, default: 'New' },
  totalPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Quotation = mongoose.model('Quotation', quotationSchema);

// Function to check recent quotations
const checkRecentQuotations = async () => {
  try {
    const recentQuotations = await Quotation.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`\n📋 Found ${recentQuotations.length} recent quotations:`);
    
    if (recentQuotations.length === 0) {
      console.log('   No quotations found in database');
      return;
    }
    
    recentQuotations.forEach((quotation, index) => {
      console.log(`\n🆔 ${quotation.quotationId}:`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Price: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
      console.log(`   User Type: ${quotation.userType || 'N/A'}`);
      console.log(`   Customer: ${quotation.customerName} (${quotation.customerEmail})`);
      console.log(`   Created: ${quotation.createdAt}`);
      console.log(`   Status: ${quotation.status || 'N/A'}`);
      
      if (quotation.productDetails) {
        console.log(`   Product Details:`, JSON.stringify(quotation.productDetails, null, 2));
      }
    });
    
    // Check quotations created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayQuotations = await Quotation.find({
      createdAt: { $gte: today }
    });
    
    console.log(`\n📅 Quotations created today (${today.toDateString()}): ${todayQuotations.length}`);
    
    if (todayQuotations.length > 0) {
      todayQuotations.forEach(quotation => {
        console.log(`   🆔 ${quotation.quotationId} - ₹${quotation.totalPrice?.toLocaleString('en-IN')} - ${quotation.productName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking quotations:', error);
  }
};

// Function to monitor for new quotations
const monitorQuotations = async () => {
  console.log('🔍 Starting quotation monitoring...');
  console.log('📝 This will check for new quotations every 2 seconds');
  console.log('🛑 Press Ctrl+C to stop monitoring\n');
  
  let lastQuotationCount = 0;
  let lastQuotationId = '';
  
  while (true) {
    try {
      const currentQuotations = await Quotation.find().sort({ createdAt: -1 });
      const currentCount = currentQuotations.length;
      const latestQuotation = currentQuotations[0];
      
      if (currentCount > lastQuotationCount || 
          (latestQuotation && latestQuotation.quotationId !== lastQuotationId)) {
        
        console.log('\n🎉 NEW QUOTATION DETECTED!');
        console.log('=' * 50);
        
        if (latestQuotation) {
          console.log(`🆔 Quotation ID: ${latestQuotation.quotationId}`);
          console.log(`📦 Product: ${latestQuotation.productName}`);
          console.log(`💰 Price: ₹${latestQuotation.totalPrice?.toLocaleString('en-IN')}`);
          console.log(`👤 Customer: ${latestQuotation.customerName}`);
          console.log(`📧 Email: ${latestQuotation.customerEmail}`);
          console.log(`🏷️ User Type: ${latestQuotation.userType}`);
          console.log(`📅 Created: ${latestQuotation.createdAt}`);
          console.log(`✅ Status: ${latestQuotation.status}`);
          
          if (latestQuotation.productDetails) {
            console.log(`\n📋 Product Details:`);
            console.log(`   - Product ID: ${latestQuotation.productDetails.productId || 'N/A'}`);
            console.log(`   - Cabinet Grid: ${JSON.stringify(latestQuotation.productDetails.cabinetGrid) || 'N/A'}`);
            console.log(`   - Processor: ${latestQuotation.productDetails.processor || 'N/A'}`);
            console.log(`   - Display Config: ${JSON.stringify(latestQuotation.productDetails.displaySize) || 'N/A'}`);
          }
          
          console.log('=' * 50);
        }
        
        lastQuotationCount = currentCount;
        lastQuotationId = latestQuotation?.quotationId || '';
      }
      
      // Show timestamp every 10 seconds
      const now = new Date();
      if (now.getSeconds() % 10 === 0) {
        console.log(`⏰ Monitoring... ${now.toLocaleTimeString()} (${currentCount} quotations total)`);
      }
      
    } catch (error) {
      console.error('❌ Error during monitoring:', error);
    }
    
    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Check initial state
  await checkRecentQuotations();
  
  // Start monitoring
  await monitorQuotations();
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping quotation monitoring...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start monitoring
main().catch(console.error);
