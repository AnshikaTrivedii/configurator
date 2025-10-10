/**
 * PRODUCTION QUOTATION DATABASE RESET SCRIPT
 * 
 * This script clears all quotation data from the PRODUCTION database
 * to remove corrupted data where all quotations show the same price.
 * 
 * Usage: CONFIRM_RESET=yes node backend/reset-production-quotations.cjs
 * 
 * WARNING: This will DELETE ALL quotations from PRODUCTION database!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  quotationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesUser',
    required: true
  },
  salesUserName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productDetails: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  userType: {
    type: String,
    enum: ['endUser', 'siChannel', 'reseller'],
    required: true
  },
  userTypeDisplayName: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['New', 'In Progress', 'Rejected', 'Hold', 'Converted'],
    default: 'New'
  }
}, {
  timestamps: true
});

const Quotation = mongoose.model('Quotation', quotationSchema);

async function resetProductionQuotations() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔄 PRODUCTION QUOTATION DATABASE RESET SCRIPT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to PRODUCTION MongoDB
    const mongoUri = process.env.MONGODB_URI;
    console.log('📡 Connecting to PRODUCTION MongoDB...');
    console.log('🔗 URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to PRODUCTION MongoDB\n');

    // Get current quotation count
    const currentCount = await Quotation.countDocuments();
    console.log(`📊 Current quotations in PRODUCTION database: ${currentCount}`);

    if (currentCount === 0) {
      console.log('\n✅ PRODUCTION database is already clean - no quotations to remove');
      await mongoose.connection.close();
      return;
    }

    // Show sample of existing quotations
    console.log('\n📋 Sample of existing quotations (showing up to 10):');
    const sampleQuotations = await Quotation.find()
      .select('quotationId customerName productName totalPrice status createdAt')
      .limit(10)
      .lean();

    sampleQuotations.forEach((q, index) => {
      console.log(`   ${index + 1}. ID: ${q.quotationId}`);
      console.log(`      Customer: ${q.customerName}`);
      console.log(`      Product: ${q.productName}`);
      console.log(`      Price: ₹${q.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
      console.log(`      Status: ${q.status}`);
      console.log(`      Created: ${new Date(q.createdAt).toLocaleString('en-IN')}`);
      console.log('');
    });

    // Check for price corruption
    const prices = await Quotation.distinct('totalPrice');
    console.log(`💰 Unique prices found: ${prices.length}`);
    if (prices.length === 1) {
      console.log(`⚠️  CORRUPTION DETECTED: All quotations have the same price: ₹${prices[0]?.toLocaleString('en-IN')}`);
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will DELETE ALL quotations from the PRODUCTION database!');
    console.log('⚠️  This action CANNOT be undone!\n');
    
    if (process.env.CONFIRM_RESET !== 'yes') {
      console.log('❌ Reset cancelled - set CONFIRM_RESET=yes to proceed');
      console.log('   Example: CONFIRM_RESET=yes node backend/reset-production-quotations.cjs\n');
      await mongoose.connection.close();
      return;
    }

    console.log('🗑️  Deleting all quotations from PRODUCTION database...\n');

    // Delete all quotations
    const deleteResult = await Quotation.deleteMany({});
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} quotations from PRODUCTION`);

    // Verify deletion
    const remainingCount = await Quotation.countDocuments();
    console.log(`📊 Remaining quotations: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('\n✅ PRODUCTION database successfully reset - all quotations removed');
      console.log('🎉 The Super Admin dashboard will now show 0 quotations');
      console.log('📝 New quotations created will have correct, unique prices');
    } else {
      console.log(`\n⚠️  Warning: ${remainingCount} quotations still remain in database`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PRODUCTION RESET COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('📡 Database connection closed\n');

  } catch (error) {
    console.error('\n❌ Error resetting PRODUCTION database:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Run the script
resetProductionQuotations();
