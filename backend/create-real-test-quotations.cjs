/**
 * CREATE REAL TEST QUOTATIONS SCRIPT
 * 
 * This script creates test quotations using the ACTUAL product data and pricing logic
 * to ensure the Super User Dashboard shows the same prices as the PDF generation.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// SalesUser Schema
const salesUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  location: String,
  contactNumber: String,
  role: String
}, { timestamps: true });

const SalesUser = mongoose.model('SalesUser', salesUserSchema);

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  quotationId: String,
  salesUserId: mongoose.Schema.Types.ObjectId,
  salesUserName: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  productName: String,
  productDetails: mongoose.Schema.Types.Mixed,
  message: String,
  userType: String,
  userTypeDisplayName: String,
  totalPrice: Number,
  status: String
}, { timestamps: true });

const Quotation = mongoose.model('Quotation', quotationSchema);

// Real product data (from src/data/products.ts)
const realProducts = {
  'bellatrix-indoor-cob-p1.25': {
    id: 'bellatrix-indoor-cob-p1.25',
    name: 'Bellatrix Series Indoor COB P1.25',
    category: 'Bellatrix Series',
    price: 27200,
    siChannelPrice: 24480,
    resellerPrice: 23120,
    cabinetDimensions: { width: 600, height: 337.5 }
  },
  'rigel-p3-outdoor': {
    id: 'rigel-p3-outdoor',
    name: 'Orion P3 Outdoor Rigel Series',
    category: 'Rigel Series',
    price: 35000,
    siChannelPrice: 31500,
    resellerPrice: 29750,
    cabinetDimensions: { width: 768, height: 768 }
  },
  'transparent-front-glass-p6.25': {
    id: 'transparent-front-glass-p6.25',
    name: 'Standard Transparent Screen P3.91-7.82 (256x128)',
    category: 'Transparent Series',
    price: 45000,
    siChannelPrice: 40500,
    resellerPrice: 38250,
    cabinetDimensions: { width: 1000, height: 500 }
  }
};

// Processor pricing (from PDF logic)
const processorPrices = {
  'TB2': { endUser: 35000, reseller: 29800, channel: 31500 },
  'TB40': { endUser: 35000, reseller: 29800, channel: 31500 },
  'TB60': { endUser: 65000, reseller: 55300, channel: 58500 }
};

async function createRealTestQuotations() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🧪 CREATING REAL TEST QUOTATIONS WITH ACTUAL PRODUCT PRICING');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get test user
    const testUser = await SalesUser.findOne({ email: 'anshika.trivedi@orion-led.com' });
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }

    // Clear existing test quotations
    await Quotation.deleteMany({ quotationId: { $regex: '^REAL-TEST-' } });
    console.log('🗑️  Cleared existing test quotations\n');

    // Test configurations with real product data
    const testConfigurations = [
      {
        quotationId: 'REAL-TEST-001',
        productKey: 'bellatrix-indoor-cob-p1.25',
        userType: 'endUser',
        userTypeDisplayName: 'End User',
        cabinetGrid: { columns: 2, rows: 1 },
        processor: 'TB2',
        config: { width: 1200, height: 337.5, unit: 'mm' },
        customerName: 'Real Test Customer 1',
        customerEmail: 'realtest1@example.com',
        customerPhone: '9876543210'
      },
      {
        quotationId: 'REAL-TEST-002',
        productKey: 'rigel-p3-outdoor',
        userType: 'reseller',
        userTypeDisplayName: 'Reseller',
        cabinetGrid: { columns: 3, rows: 2 },
        processor: 'TB40',
        config: { width: 2304, height: 1536, unit: 'mm' },
        customerName: 'Real Test Customer 2',
        customerEmail: 'realtest2@example.com',
        customerPhone: '9876543211'
      },
      {
        quotationId: 'REAL-TEST-003',
        productKey: 'transparent-front-glass-p6.25',
        userType: 'siChannel',
        userTypeDisplayName: 'Channel',
        cabinetGrid: { columns: 4, rows: 3 },
        processor: 'TB60',
        config: { width: 4000, height: 1500, unit: 'mm' },
        customerName: 'Real Test Customer 3',
        customerEmail: 'realtest3@example.com',
        customerPhone: '9876543212'
      }
    ];

    console.log('📋 Creating real test quotations...\n');

    for (const testConfig of testConfigurations) {
      try {
        const product = realProducts[testConfig.productKey];
        if (!product) {
          console.error(`❌ Product not found: ${testConfig.productKey}`);
          continue;
        }

        // Calculate pricing using REAL product data and PDF logic
        const METERS_TO_FEET = 3.2808399;
        
        // Get unit price based on user type
        let unitPrice;
        if (testConfig.userType === 'reseller') {
          unitPrice = product.resellerPrice;
        } else if (testConfig.userType === 'siChannel') {
          unitPrice = product.siChannelPrice;
        } else {
          unitPrice = product.price;
        }

        // Calculate quantity in square feet (PDF logic)
        const widthInMeters = testConfig.config.width / 1000;
        const heightInMeters = testConfig.config.height / 1000;
        const widthInFeet = widthInMeters * METERS_TO_FEET;
        const heightInFeet = heightInMeters * METERS_TO_FEET;
        const quantity = widthInFeet * heightInFeet;

        // Calculate product pricing
        const productSubtotal = unitPrice * quantity;
        const productGST = productSubtotal * 0.18;
        const productTotal = productSubtotal + productGST;

        // Calculate processor pricing
        const processorPrice = processorPrices[testConfig.processor][testConfig.userType === 'reseller' ? 'reseller' : testConfig.userType === 'siChannel' ? 'channel' : 'endUser'];
        const processorGST = processorPrice * 0.18;
        const processorTotal = processorPrice + processorGST;

        // Calculate grand total (PDF logic)
        const grandTotal = productTotal + processorTotal;

        // Create comprehensive product details
        const productDetails = {
          productId: product.id,
          productName: product.name,
          category: product.category,
          price: product.price,
          resellerPrice: product.resellerPrice,
          siChannelPrice: product.siChannelPrice,
          cabinetGrid: testConfig.cabinetGrid,
          processor: testConfig.processor,
          userType: testConfig.userType,
          userTypeDisplayName: testConfig.userTypeDisplayName,
          displaySize: {
            width: Number((testConfig.config.width / 1000).toFixed(2)),
            height: Number((testConfig.config.height / 1000).toFixed(2))
          },
          // CRITICAL: Complete pricing breakdown (matches PDF exactly)
          pricingBreakdown: {
            unitPrice: unitPrice,
            quantity: quantity,
            productSubtotal: productSubtotal,
            productGST: productGST,
            productTotal: productTotal,
            processorPrice: processorPrice,
            processorGST: processorGST,
            processorTotal: processorTotal,
            grandTotal: Math.round(grandTotal),
            userType: testConfig.userTypeDisplayName,
            productName: product.name,
            processorName: testConfig.processor,
            cabinetGrid: testConfig.cabinetGrid,
            displaySize: {
              width: Number((testConfig.config.width / 1000).toFixed(2)),
              height: Number((testConfig.config.height / 1000).toFixed(2))
            }
          }
        };

        // Create quotation
        const quotation = new Quotation({
          quotationId: testConfig.quotationId,
          salesUserId: testUser._id,
          salesUserName: testUser.name,
          customerName: testConfig.customerName,
          customerEmail: testConfig.customerEmail,
          customerPhone: testConfig.customerPhone,
          productName: product.name,
          productDetails: productDetails,
          message: 'Real test quotation with actual product pricing',
          userType: testConfig.userType,
          userTypeDisplayName: testConfig.userTypeDisplayName,
          status: 'New',
          totalPrice: Math.round(grandTotal) // Store the calculated grand total
        });

        await quotation.save();

        console.log(`✅ Created real quotation: ${testConfig.quotationId}`);
        console.log(`   Product: ${product.name}`);
        console.log(`   User Type: ${testConfig.userTypeDisplayName}`);
        console.log(`   Unit Price: ₹${unitPrice.toLocaleString('en-IN')}`);
        console.log(`   Quantity: ${quantity.toFixed(2)} sq.ft`);
        console.log(`   Product Total: ₹${productTotal.toLocaleString('en-IN')}`);
        console.log(`   Processor Total: ₹${processorTotal.toLocaleString('en-IN')}`);
        console.log(`   GRAND TOTAL: ₹${Math.round(grandTotal).toLocaleString('en-IN')}`);
        console.log(`   Stored Price: ₹${quotation.totalPrice.toLocaleString('en-IN')}`);
        console.log(`   Price Match: ${quotation.totalPrice === Math.round(grandTotal) ? '✅' : '❌'}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error creating quotation ${testConfig.quotationId}:`, error.message);
      }
    }

    // Verify all created quotations
    console.log('🔍 VERIFYING REAL TEST QUOTATIONS...\n');

    const realQuotations = await Quotation.find({ quotationId: { $regex: '^REAL-TEST-' } }).lean();
    console.log(`📊 Found ${realQuotations.length} real test quotations\n`);

    realQuotations.forEach((quotation, index) => {
      console.log(`📄 Real Quotation ${index + 1}: ${quotation.quotationId}`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Stored Price: ₹${quotation.totalPrice.toLocaleString('en-IN')}`);
      
      if (quotation.productDetails && quotation.productDetails.pricingBreakdown) {
        const breakdown = quotation.productDetails.pricingBreakdown;
        console.log(`   Breakdown Price: ₹${breakdown.grandTotal.toLocaleString('en-IN')}`);
        console.log(`   Unit Price: ₹${breakdown.unitPrice.toLocaleString('en-IN')}`);
        console.log(`   Quantity: ${breakdown.quantity.toFixed(2)} sq.ft`);
        console.log(`   Product Total: ₹${breakdown.productTotal.toLocaleString('en-IN')}`);
        console.log(`   Processor Total: ₹${breakdown.processorTotal.toLocaleString('en-IN')}`);
        
        if (quotation.totalPrice === breakdown.grandTotal) {
          console.log(`   ✅ Price consistency: Database matches breakdown`);
        } else {
          console.log(`   ❌ Price mismatch: Database (₹${quotation.totalPrice}) ≠ Breakdown (₹${breakdown.grandTotal})`);
        }
      }
      console.log('');
    });

    // Check for unique prices
    const prices = realQuotations.map(q => q.totalPrice);
    const uniquePrices = [...new Set(prices)];
    
    console.log('📊 PRICE UNIQUENESS CHECK:');
    console.log(`   Total quotations: ${prices.length}`);
    console.log(`   Unique prices: ${uniquePrices.length}`);
    console.log(`   All prices: ${prices.map(p => '₹' + p.toLocaleString('en-IN')).join(', ')}`);
    
    if (prices.length === uniquePrices.length) {
      console.log('   ✅ All quotations have unique prices');
    } else {
      console.log('   ❌ Some quotations have duplicate prices');
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Refresh your Super Admin Dashboard');
    console.log('   2. Click on Anshika Trivedi to view quotations');
    console.log('   3. Verify each quotation shows the correct prices');
    console.log('   4. Generate PDFs to confirm prices match');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ REAL TEST QUOTATIONS CREATED');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('\n❌ Failed to create real test quotations:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
createRealTestQuotations();
