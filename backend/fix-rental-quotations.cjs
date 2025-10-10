const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const fixRentalQuotations = async () => {
  try {
    console.log('🔧 Fixing rental series quotations with wrong pricing breakdown...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to cloud database');

    // Import Quotation model
    const { default: Quotation } = await import('./models/Quotation.js');

    // Find all rental quotations with unitPrice = 0 in exactPricingBreakdown
    const rentalQuotations = await Quotation.find({
      'productDetails.category': { $regex: /rental/i },
      'exactPricingBreakdown.unitPrice': 0
    });

    console.log(`Found ${rentalQuotations.length} rental quotations to fix:`);

    // Rental series pricing
    const rentalPricing = {
      'rental-indoor-p2.6': {
        endCustomer: 28200,
        siChannel: 26400,
        reseller: 25600
      },
      'rental-indoor-p2.97': {
        endCustomer: 27100,
        siChannel: 24800,
        reseller: 23300
      },
      'rental-indoor-p3.91': {
        endCustomer: 24600,
        siChannel: 22100,
        reseller: 20900
      },
      'rental-indoor-p4.81': {
        endCustomer: 22600,
        siChannel: 20300,
        reseller: 19200
      }
    };

    let fixedCount = 0;

    for (const quotation of rentalQuotations) {
      console.log(`\n🔍 Processing: ${quotation.quotationId}`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Current Unit Price: ₹${quotation.exactPricingBreakdown?.unitPrice || 0}`);
      console.log(`   Current Total: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 0}`);

      // Get the correct unit price based on product and user type
      let correctUnitPrice = 0;
      
      if (quotation.productDetails?.category?.toLowerCase().includes('rental')) {
        // Find the product ID from the name
        let productId = '';
        if (quotation.productName?.includes('P2.6')) productId = 'rental-indoor-p2.6';
        else if (quotation.productName?.includes('P2.97')) productId = 'rental-indoor-p2.97';
        else if (quotation.productName?.includes('P3.91')) productId = 'rental-indoor-p3.91';
        else if (quotation.productName?.includes('P4.81')) productId = 'rental-indoor-p4.81';
        
        if (productId && rentalPricing[productId]) {
          const userType = quotation.userType || 'endUser';
          if (userType === 'siChannel') {
            correctUnitPrice = rentalPricing[productId].siChannel;
          } else if (userType === 'reseller') {
            correctUnitPrice = rentalPricing[productId].reseller;
          } else {
            correctUnitPrice = rentalPricing[productId].endCustomer;
          }
        }
      }

      if (correctUnitPrice > 0) {
        // Calculate correct breakdown
        const quantity = quotation.exactPricingBreakdown?.quantity || 1;
        const subtotal = correctUnitPrice * quantity;
        const gstAmount = subtotal * 0.18;
        const processorPrice = quotation.exactPricingBreakdown?.processorPrice || 0;
        const processorGst = processorPrice * 0.18;
        const grandTotal = subtotal + gstAmount + processorPrice + processorGst;

        // Update the exactPricingBreakdown
        quotation.exactPricingBreakdown = {
          unitPrice: correctUnitPrice,
          quantity: quantity,
          subtotal: subtotal,
          gstRate: 18,
          gstAmount: gstAmount,
          processorPrice: processorPrice,
          processorGst: processorGst,
          grandTotal: Math.round(grandTotal)
        };

        // Update totalPrice to match the breakdown
        quotation.totalPrice = Math.round(grandTotal);

        await quotation.save();
        fixedCount++;

        console.log(`   ✅ Fixed Unit Price: ₹${correctUnitPrice.toLocaleString('en-IN')}`);
        console.log(`   ✅ Fixed Total: ₹${Math.round(grandTotal).toLocaleString('en-IN')}`);
        console.log(`   ✅ Breakdown: ${quantity} cabinets × ₹${correctUnitPrice.toLocaleString('en-IN')} = ₹${subtotal.toLocaleString('en-IN')} + GST`);
      } else {
        console.log(`   ⚠️  Could not determine correct unit price for ${quotation.productName}`);
      }
    }

    console.log(`\n🎉 Successfully fixed ${fixedCount} rental quotations!`);
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const verifyQuotations = await Quotation.find({
      'productDetails.category': { $regex: /rental/i },
      'exactPricingBreakdown.unitPrice': { $gt: 0 }
    }).limit(5);

    console.log(`Found ${verifyQuotations.length} rental quotations with correct pricing:`);
    verifyQuotations.forEach((q, index) => {
      console.log(`${index + 1}. ${q.quotationId}: Unit=₹${q.exactPricingBreakdown.unitPrice?.toLocaleString('en-IN')}, Total=₹${q.totalPrice?.toLocaleString('en-IN')}`);
    });

  } catch (error) {
    console.error('❌ Error fixing rental quotations:', error);
  } finally {
    await mongoose.disconnect();
  }
};

fixRentalQuotations();