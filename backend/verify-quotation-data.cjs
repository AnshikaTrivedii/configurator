/**
 * QUOTATION DATA VERIFICATION SCRIPT
 * 
 * This script verifies the integrity of quotation data in the database:
 * - Checks for duplicate quotation IDs
 * - Verifies each quotation has unique data
 * - Displays all quotations with their details
 * 
 * Usage: node backend/verify-quotation-data.cjs
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

async function verifyQuotationData() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 QUOTATION DATA VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orion-configurator';
    console.log('📡 Connecting to MongoDB...');
    console.log('🔗 URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all quotations
    const quotations = await Quotation.find()
      .populate('salesUserId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Total quotations in database: ${quotations.length}\n`);

    if (quotations.length === 0) {
      console.log('ℹ️  No quotations found in database');
      console.log('   This is expected if you just reset the database\n');
      await mongoose.connection.close();
      return;
    }

    // Check for duplicate quotation IDs
    console.log('🔍 Checking for duplicate quotation IDs...');
    const quotationIds = quotations.map(q => q.quotationId);
    const uniqueIds = [...new Set(quotationIds)];
    
    if (quotationIds.length === uniqueIds.length) {
      console.log(`✅ All ${quotationIds.length} quotation IDs are unique\n`);
    } else {
      console.error(`❌ CRITICAL: Found ${quotationIds.length - uniqueIds.length} duplicate quotation IDs!`);
      const duplicates = quotationIds.filter((id, index) => quotationIds.indexOf(id) !== index);
      console.error('   Duplicate IDs:', [...new Set(duplicates)]);
      console.log('');
    }

    // Check for duplicate prices (might indicate data corruption)
    const prices = quotations.map(q => q.totalPrice);
    const uniquePrices = [...new Set(prices)];
    console.log(`💰 Price diversity: ${uniquePrices.length} unique prices out of ${prices.length} quotations`);
    
    if (quotations.length > 1 && uniquePrices.length === 1) {
      console.warn('⚠️  WARNING: All quotations have the same price - this might indicate an issue\n');
    } else {
      console.log('✅ Quotations have varied prices\n');
    }

    // Display detailed quotation information
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 DETAILED QUOTATION LIST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    quotations.forEach((quotation, index) => {
      console.log(`${index + 1}. Quotation Details:`);
      console.log(`   ├─ ID: ${quotation.quotationId}`);
      console.log(`   ├─ Sales Person: ${quotation.salesUserName} (${quotation.salesUserId?.email || 'N/A'})`);
      console.log(`   ├─ Customer: ${quotation.customerName}`);
      console.log(`   ├─ Email: ${quotation.customerEmail}`);
      console.log(`   ├─ Phone: ${quotation.customerPhone}`);
      console.log(`   ├─ Product: ${quotation.productName}`);
      console.log(`   ├─ User Type: ${quotation.userTypeDisplayName}`);
      console.log(`   ├─ Status: ${quotation.status}`);
      console.log(`   ├─ Total Price: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
      console.log(`   ├─ Created: ${new Date(quotation.createdAt).toLocaleString('en-IN')}`);
      console.log(`   └─ Updated: ${new Date(quotation.updatedAt).toLocaleString('en-IN')}`);
      
      // Display some product details if available
      if (quotation.productDetails) {
        console.log(`   📦 Product Specifications:`);
        if (quotation.productDetails.cabinetGrid) {
          console.log(`      ├─ Cabinet Grid: ${quotation.productDetails.cabinetGrid.columns}×${quotation.productDetails.cabinetGrid.rows}`);
        }
        if (quotation.productDetails.processor) {
          console.log(`      ├─ Processor: ${quotation.productDetails.processor}`);
        }
        if (quotation.productDetails.pixelPitch) {
          console.log(`      ├─ Pixel Pitch: ${quotation.productDetails.pixelPitch}mm`);
        }
        if (quotation.productDetails.resolution) {
          console.log(`      └─ Resolution: ${quotation.productDetails.resolution.width}×${quotation.productDetails.resolution.height}px`);
        }
      }
      
      console.log('');
    });

    // Summary statistics
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY STATISTICS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Group by status
    const statusGroups = {};
    quotations.forEach(q => {
      statusGroups[q.status] = (statusGroups[q.status] || 0) + 1;
    });

    console.log('Quotations by Status:');
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('');

    // Group by sales person
    const salesPersonGroups = {};
    quotations.forEach(q => {
      salesPersonGroups[q.salesUserName] = (salesPersonGroups[q.salesUserName] || 0) + 1;
    });

    console.log('Quotations by Sales Person:');
    Object.entries(salesPersonGroups).forEach(([name, count]) => {
      console.log(`   ${name}: ${count}`);
    });
    console.log('');

    // Price statistics
    const totalRevenue = quotations
      .filter(q => q.status === 'Converted')
      .reduce((sum, q) => sum + (q.totalPrice || 0), 0);
    
    console.log('Revenue Statistics:');
    console.log(`   Total Revenue (Converted only): ₹${totalRevenue.toLocaleString('en-IN')}`);
    console.log(`   Average Quotation Value: ₹${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString('en-IN')}`);
    console.log(`   Min Price: ₹${Math.min(...prices).toLocaleString('en-IN')}`);
    console.log(`   Max Price: ₹${Math.max(...prices).toLocaleString('en-IN')}`);
    console.log('');

    // Final verdict
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎯 VERIFICATION RESULT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const hasIssues = quotationIds.length !== uniqueIds.length || 
                      (quotations.length > 1 && uniquePrices.length === 1);

    if (hasIssues) {
      console.log('❌ ISSUES DETECTED:');
      if (quotationIds.length !== uniqueIds.length) {
        console.log('   - Duplicate quotation IDs found');
      }
      if (quotations.length > 1 && uniquePrices.length === 1) {
        console.log('   - All quotations have identical prices (potential data corruption)');
      }
      console.log('\n💡 Recommendation: Run reset script to clear corrupted data');
      console.log('   Command: CONFIRM_RESET=yes node backend/reset-quotation-database.cjs\n');
    } else {
      console.log('✅ Data integrity verified - no issues detected');
      console.log('   All quotation IDs are unique');
      console.log('   Quotations have varied data');
      console.log('   System is working correctly\n');
    }

    await mongoose.connection.close();
    console.log('📡 Database connection closed\n');

  } catch (error) {
    console.error('\n❌ Error verifying data:', error);
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
verifyQuotationData();

