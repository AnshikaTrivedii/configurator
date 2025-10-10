/**
 * DASHBOARD ACCURACY VERIFICATION SCRIPT
 * 
 * This script verifies that the Super User Dashboard is showing accurate quotation data:
 * 1. Checks that all quotations have unique prices
 * 2. Validates that stored prices match pricing breakdowns
 * 3. Ensures no price corruption exists
 * 4. Confirms database and dashboard consistency
 * 
 * Usage: node backend/verify-dashboard-accuracy.cjs
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  quotationId: String,
  totalPrice: Number,
  productName: String,
  customerName: String,
  productDetails: mongoose.Schema.Types.Mixed,
  createdAt: Date
});

const Quotation = mongoose.model('Quotation', quotationSchema);

async function verifyDashboardAccuracy() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 DASHBOARD ACCURACY VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get all quotations
    const quotations = await Quotation.find().sort({ createdAt: -1 }).lean();
    console.log(`📊 Total quotations in database: ${quotations.length}\n`);

    if (quotations.length === 0) {
      console.log('ℹ️  No quotations found in database');
      console.log('   This is expected if you just reset the database');
      console.log('   Create some test quotations to verify the fix');
      await mongoose.connection.close();
      return;
    }

    // Analyze quotations
    console.log('📋 ANALYZING QUOTATIONS...\n');

    const prices = quotations.map(q => q.totalPrice);
    const uniquePrices = [...new Set(prices)];
    const quotationIds = quotations.map(q => q.quotationId);
    const uniqueIds = [...new Set(quotationIds)];

    console.log('📊 BASIC STATISTICS:');
    console.log(`   Total quotations: ${quotations.length}`);
    console.log(`   Unique quotation IDs: ${uniqueIds.length}`);
    console.log(`   Unique prices: ${uniquePrices.length}`);
    console.log('');

    // Check for duplicate IDs
    if (quotationIds.length === uniqueIds.length) {
      console.log('✅ All quotation IDs are unique');
    } else {
      console.log('❌ Found duplicate quotation IDs!');
      const duplicates = quotationIds.filter((id, index) => quotationIds.indexOf(id) !== index);
      console.log('   Duplicate IDs:', [...new Set(duplicates)]);
    }

    // Check for duplicate prices
    if (prices.length === uniquePrices.length) {
      console.log('✅ All quotations have unique prices');
    } else {
      console.log('❌ Found quotations with duplicate prices!');
      const priceCounts = {};
      prices.forEach(price => {
        priceCounts[price] = (priceCounts[price] || 0) + 1;
      });
      const duplicatePrices = Object.entries(priceCounts).filter(([price, count]) => count > 1);
      duplicatePrices.forEach(([price, count]) => {
        console.log(`   Price ₹${parseInt(price).toLocaleString('en-IN')}: ${count} quotations`);
      });
    }

    console.log('');

    // Detailed analysis of each quotation
    console.log('📋 DETAILED QUOTATION ANALYSIS:');
    console.log('═══════════════════════════════════════════════════════════════');

    let consistencyIssues = 0;
    let breakdownIssues = 0;

    quotations.forEach((quotation, index) => {
      console.log(`\n📄 Quotation ${index + 1}: ${quotation.quotationId}`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Customer: ${quotation.customerName}`);
      console.log(`   Stored Price: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
      console.log(`   Created: ${new Date(quotation.createdAt).toLocaleString('en-IN')}`);

      // Check pricing breakdown consistency
      if (quotation.productDetails && quotation.productDetails.pricingBreakdown) {
        const breakdown = quotation.productDetails.pricingBreakdown;
        console.log(`   Breakdown Price: ₹${breakdown.grandTotal?.toLocaleString('en-IN') || 'N/A'}`);
        
        if (quotation.totalPrice === breakdown.grandTotal) {
          console.log(`   ✅ Price consistency: Database matches breakdown`);
        } else {
          console.log(`   ❌ Price mismatch: Database (₹${quotation.totalPrice}) ≠ Breakdown (₹${breakdown.grandTotal})`);
          consistencyIssues++;
        }
      } else {
        console.log(`   ⚠️  No pricing breakdown found in product details`);
        breakdownIssues++;
      }
    });

    // Price range analysis
    console.log('\n📊 PRICE RANGE ANALYSIS:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      console.log(`   Minimum price: ₹${minPrice.toLocaleString('en-IN')}`);
      console.log(`   Maximum price: ₹${maxPrice.toLocaleString('en-IN')}`);
      console.log(`   Average price: ₹${Math.round(avgPrice).toLocaleString('en-IN')}`);
      console.log(`   Price range: ₹${(maxPrice - minPrice).toLocaleString('en-IN')}`);
      
      // Check for suspicious patterns
      if (minPrice === maxPrice) {
        console.log('   ⚠️  WARNING: All quotations have the same price!');
        console.log('   This indicates potential price corruption.');
      } else if (maxPrice - minPrice < 1000) {
        console.log('   ⚠️  WARNING: Very small price variation!');
        console.log('   This might indicate pricing issues.');
      } else {
        console.log('   ✅ Good price variation detected');
      }
    }

    // Final assessment
    console.log('\n🏁 FINAL ASSESSMENT:');
    console.log('═══════════════════════════════════════════════════════════════');

    const hasDuplicateIds = quotationIds.length !== uniqueIds.length;
    const hasDuplicatePrices = prices.length !== uniquePrices.length;
    const hasConsistencyIssues = consistencyIssues > 0;
    const hasBreakdownIssues = breakdownIssues > 0;

    if (!hasDuplicateIds && !hasDuplicatePrices && !hasConsistencyIssues && !hasBreakdownIssues) {
      console.log('✅ DASHBOARD ACCURACY: EXCELLENT');
      console.log('   - All quotation IDs are unique');
      console.log('   - All prices are unique');
      console.log('   - All prices match their breakdowns');
      console.log('   - Super Admin Dashboard will display accurate data');
    } else {
      console.log('❌ DASHBOARD ACCURACY: ISSUES DETECTED');
      if (hasDuplicateIds) {
        console.log('   - Duplicate quotation IDs found');
      }
      if (hasDuplicatePrices) {
        console.log('   - Duplicate prices found');
      }
      if (hasConsistencyIssues) {
        console.log(`   - ${consistencyIssues} price consistency issues`);
      }
      if (hasBreakdownIssues) {
        console.log(`   - ${breakdownIssues} quotations missing pricing breakdowns`);
      }
    }

    console.log('\n📝 RECOMMENDATIONS:');
    if (hasDuplicateIds || hasDuplicatePrices || hasConsistencyIssues) {
      console.log('   1. Run the database reset script to clear corrupted data');
      console.log('   2. Create new quotations using the fixed system');
      console.log('   3. Verify that new quotations have unique prices');
    } else {
      console.log('   1. ✅ System is working correctly');
      console.log('   2. ✅ Super Admin Dashboard will show accurate data');
      console.log('   3. ✅ No action required');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ DASHBOARD ACCURACY VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('📡 Database connection closed\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the verification
verifyDashboardAccuracy();
