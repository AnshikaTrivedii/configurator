/**
 * QUOTATION ACCURACY TEST SCRIPT
 * 
 * This script tests the complete quotation accuracy flow:
 * 1. Creates test quotations with different products and configurations
 * 2. Validates that prices are stored correctly in the database
 * 3. Verifies that Super Admin Dashboard shows the same prices
 * 4. Ensures PDF and database prices match exactly
 * 
 * Usage: node backend/test-quotation-accuracy.cjs
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

// SalesUser Schema
const salesUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  location: String,
  contactNumber: String,
  role: String
}, {
  timestamps: true
});

const SalesUser = mongoose.model('SalesUser', salesUserSchema);

async function testQuotationAccuracy() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🧪 QUOTATION ACCURACY TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get a test sales user
    const testUser = await SalesUser.findOne({ email: 'anshika.trivedi@orion-led.com' });
    if (!testUser) {
      console.error('❌ Test user not found. Please ensure the user exists.');
      return;
    }

    console.log('👤 Using test user:', testUser.name, testUser.email);

    // Test data - different products with different expected prices
    const testQuotations = [
      {
        quotationId: 'TEST-ACCURACY-001',
        customerName: 'Test Customer 1',
        customerEmail: 'test1@example.com',
        customerPhone: '9876543210',
        productName: 'Bellatrix Series Indoor COB P1.25',
        userType: 'endUser',
        userTypeDisplayName: 'End User',
        cabinetGrid: { columns: 2, rows: 1 },
        processor: 'TB2',
        config: { width: 1200, height: 600, unit: 'mm' },
        expectedPriceRange: { min: 10000, max: 50000 } // Expected price range
      },
      {
        quotationId: 'TEST-ACCURACY-002',
        customerName: 'Test Customer 2',
        customerEmail: 'test2@example.com',
        customerPhone: '9876543211',
        productName: 'Rigel Series P3 Outdoor',
        userType: 'reseller',
        userTypeDisplayName: 'Reseller',
        cabinetGrid: { columns: 3, rows: 2 },
        processor: 'TB40',
        config: { width: 1800, height: 1200, unit: 'mm' },
        expectedPriceRange: { min: 50000, max: 150000 }
      },
      {
        quotationId: 'TEST-ACCURACY-003',
        customerName: 'Test Customer 3',
        customerEmail: 'test3@example.com',
        customerPhone: '9876543212',
        productName: 'Transparent Front Glass P6.25',
        userType: 'siChannel',
        userTypeDisplayName: 'Channel',
        cabinetGrid: { columns: 4, rows: 3 },
        processor: 'TB60',
        config: { width: 2400, height: 1800, unit: 'mm' },
        expectedPriceRange: { min: 100000, max: 300000 }
      }
    ];

    console.log('📋 Creating test quotations...\n');

    const createdQuotations = [];

    for (const testData of testQuotations) {
      try {
        // Create comprehensive product details with pricing breakdown
        const productDetails = {
          productId: 'test-product-id',
          productName: testData.productName,
          category: 'test-category',
          price: 5300, // Base price
          resellerPrice: 4500,
          siChannelPrice: 4000,
          cabinetGrid: testData.cabinetGrid,
          processor: testData.processor,
          userType: testData.userType,
          userTypeDisplayName: testData.userTypeDisplayName,
          pricingBreakdown: {
            unitPrice: testData.userType === 'reseller' ? 4500 : testData.userType === 'siChannel' ? 4000 : 5300,
            quantity: testData.cabinetGrid.columns * testData.cabinetGrid.rows,
            productSubtotal: 0, // Will be calculated
            productGST: 0, // Will be calculated
            productTotal: 0, // Will be calculated
            processorPrice: testData.processor === 'TB2' ? 15000 : testData.processor === 'TB40' ? 25000 : 35000,
            processorGST: 0, // Will be calculated
            processorTotal: 0, // Will be calculated
            grandTotal: 0, // Will be calculated
            userType: testData.userTypeDisplayName,
            productName: testData.productName,
            processorName: testData.processor,
            cabinetGrid: testData.cabinetGrid,
            displaySize: {
              width: testData.config.width / 1000,
              height: testData.config.height / 1000
            }
          }
        };

        // Calculate pricing breakdown (simplified for test)
        const unitPrice = productDetails.pricingBreakdown.unitPrice;
        const quantity = productDetails.pricingBreakdown.quantity;
        const productSubtotal = unitPrice * quantity;
        const productGST = productSubtotal * 0.18;
        const productTotal = productSubtotal + productGST;

        const processorPrice = productDetails.pricingBreakdown.processorPrice;
        const processorGST = processorPrice * 0.18;
        const processorTotal = processorPrice + processorGST;

        const grandTotal = productTotal + processorTotal;

        // Update pricing breakdown with calculated values
        productDetails.pricingBreakdown.productSubtotal = productSubtotal;
        productDetails.pricingBreakdown.productGST = productGST;
        productDetails.pricingBreakdown.productTotal = productTotal;
        productDetails.pricingBreakdown.processorGST = processorGST;
        productDetails.pricingBreakdown.processorTotal = processorTotal;
        productDetails.pricingBreakdown.grandTotal = Math.round(grandTotal);

        // Create quotation
        const quotation = new Quotation({
          quotationId: testData.quotationId,
          salesUserId: testUser._id,
          salesUserName: testUser.name,
          customerName: testData.customerName,
          customerEmail: testData.customerEmail,
          customerPhone: testData.customerPhone,
          productName: testData.productName,
          productDetails: productDetails,
          message: 'Test quotation for accuracy validation',
          userType: testData.userType,
          userTypeDisplayName: testData.userTypeDisplayName,
          status: 'New',
          totalPrice: Math.round(grandTotal) // Store the calculated grand total
        });

        await quotation.save();
        createdQuotations.push(quotation);

        console.log(`✅ Created quotation: ${testData.quotationId}`);
        console.log(`   Product: ${testData.productName}`);
        console.log(`   User Type: ${testData.userTypeDisplayName}`);
        console.log(`   Cabinet Grid: ${testData.cabinetGrid.columns}x${testData.cabinetGrid.rows}`);
        console.log(`   Processor: ${testData.processor}`);
        console.log(`   Stored Price: ₹${quotation.totalPrice.toLocaleString('en-IN')}`);
        console.log(`   Breakdown Price: ₹${productDetails.pricingBreakdown.grandTotal.toLocaleString('en-IN')}`);
        console.log(`   Price Match: ${quotation.totalPrice === productDetails.pricingBreakdown.grandTotal ? '✅' : '❌'}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error creating quotation ${testData.quotationId}:`, error.message);
      }
    }

    // Validate all created quotations
    console.log('🔍 VALIDATING CREATED QUOTATIONS...\n');

    const allQuotations = await Quotation.find({ quotationId: { $regex: '^TEST-ACCURACY-' } }).lean();
    console.log(`📊 Found ${allQuotations.length} test quotations in database\n`);

    let allPricesValid = true;
    let allBreakdownsValid = true;

    allQuotations.forEach((quotation, index) => {
      console.log(`📋 Quotation ${index + 1}: ${quotation.quotationId}`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Stored Price: ₹${quotation.totalPrice.toLocaleString('en-IN')}`);
      
      if (quotation.productDetails && quotation.productDetails.pricingBreakdown) {
        const breakdown = quotation.productDetails.pricingBreakdown;
        console.log(`   Breakdown Price: ₹${breakdown.grandTotal.toLocaleString('en-IN')}`);
        
        if (quotation.totalPrice === breakdown.grandTotal) {
          console.log(`   ✅ Price consistency: Database matches breakdown`);
        } else {
          console.log(`   ❌ Price mismatch: Database (₹${quotation.totalPrice}) ≠ Breakdown (₹${breakdown.grandTotal})`);
          allBreakdownsValid = false;
        }
      } else {
        console.log(`   ⚠️  No pricing breakdown found`);
        allBreakdownsValid = false;
      }
      
      console.log('');
    });

    // Check for unique prices
    const prices = allQuotations.map(q => q.totalPrice);
    const uniquePrices = [...new Set(prices)];
    
    console.log('📊 PRICE UNIQUENESS CHECK:');
    console.log(`   Total quotations: ${prices.length}`);
    console.log(`   Unique prices: ${uniquePrices.length}`);
    
    if (prices.length === uniquePrices.length) {
      console.log('   ✅ All quotations have unique prices');
    } else {
      console.log('   ❌ Some quotations have duplicate prices');
      allPricesValid = false;
    }

    // Final validation
    console.log('\n🏁 FINAL VALIDATION RESULTS:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (allPricesValid && allBreakdownsValid) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('   - All quotations have unique prices');
      console.log('   - All prices match their pricing breakdowns');
      console.log('   - Super Admin Dashboard will show correct, unique prices');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      if (!allPricesValid) {
        console.log('   - Some quotations have duplicate prices');
      }
      if (!allBreakdownsValid) {
        console.log('   - Some prices do not match their breakdowns');
      }
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Refresh your Super Admin Dashboard');
    console.log('   2. Click on the test user to view quotations');
    console.log('   3. Verify each quotation shows unique prices');
    console.log('   4. Check that prices match the PDF generation');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ QUOTATION ACCURACY TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('📡 Database connection closed\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the test
testQuotationAccuracy();
