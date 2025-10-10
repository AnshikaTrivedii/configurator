/**
 * QUOTATION DATABASE RESET SCRIPT
 * 
 * This script completely clears all quotation data from the database
 * to remove any corrupted or duplicate entries.
 * 
 * Usage: node backend/reset-quotation-database.cjs
 * 
 * WARNING: This will DELETE ALL quotations. Use with caution!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Quotation Schema (same as in models/Quotation.js)
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

async function resetQuotationDatabase() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔄 QUOTATION DATABASE RESET SCRIPT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orion-configurator';
    console.log('📡 Connecting to MongoDB...');
    console.log('🔗 URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get current quotation count
    const currentCount = await Quotation.countDocuments();
    console.log(`📊 Current quotations in database: ${currentCount}`);

    if (currentCount === 0) {
      console.log('\n✅ Database is already clean - no quotations to remove');
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

    // Ask for confirmation
    console.log('⚠️  WARNING: This will DELETE ALL quotations from the database!');
    console.log('⚠️  This action CANNOT be undone!\n');
    
    // In production, you might want to add a confirmation prompt
    // For now, we'll add a safety check via environment variable
    if (process.env.CONFIRM_RESET !== 'yes') {
      console.log('❌ Reset cancelled - set CONFIRM_RESET=yes to proceed');
      console.log('   Example: CONFIRM_RESET=yes node backend/reset-quotation-database.cjs\n');
      await mongoose.connection.close();
      return;
    }

    console.log('🗑️  Deleting all quotations...\n');

    // Delete all quotations
    const deleteResult = await Quotation.deleteMany({});
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} quotations`);

    // Verify deletion
    const remainingCount = await Quotation.countDocuments();
    console.log(`📊 Remaining quotations: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('\n✅ Database successfully reset - all quotations removed');
    } else {
      console.log(`\n⚠️  Warning: ${remainingCount} quotations still remain in database`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ RESET COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('📡 Database connection closed\n');

  } catch (error) {
    console.error('\n❌ Error resetting database:', error);
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
resetQuotationDatabase();

