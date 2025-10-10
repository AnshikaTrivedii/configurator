#!/usr/bin/env node

/**
 * Script to fix existing quotations with incorrect pricing
 * This script recalculates the totalPrice for all existing quotations
 * using the corrected pricing logic that matches the PDF generation
 */

const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator';

// Quotation Schema (simplified)
const quotationSchema = new mongoose.Schema({
  quotationId: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  productName: String,
  productDetails: mongoose.Schema.Types.Mixed,
  message: String,
  userType: String,
  userTypeDisplayName: String,
  totalPrice: Number,
  status: String,
  createdAt: Date
});

const Quotation = mongoose.model('Quotation', quotationSchema);

// Processor prices (same as in the application)
const processorPrices = {
  'TB2': { endUser: 15000, reseller: 12000, channel: 10000 },
  'TB40': { endUser: 35000, reseller: 28000, channel: 24000 },
  'TB60': { endUser: 35000, reseller: 28000, channel: 24000 },
  'VX1': { endUser: 20000, reseller: 16000, channel: 14000 },
  'VX400': { endUser: 30000, reseller: 24000, channel: 21000 },
  'VX400 Pro': { endUser: 35000, reseller: 28000, channel: 24000 },
  'VX600': { endUser: 45000, reseller: 36000, channel: 31000 },
  'VX600 Pro': { endUser: 50000, reseller: 40000, channel: 34000 },
  'VX1000': { endUser: 65000, reseller: 52000, channel: 44000 },
  'VX1000 Pro': { endUser: 70000, reseller: 56000, channel: 48000 },
  '4K PRIME': { endUser: 100000, reseller: 80000, channel: 68000 }
};

// Product prices (from products.ts)
const productPrices = {
  'bellatrix-indoor-cob-p1.25': {
    endUser: 27200,
    reseller: 23120,
    channel: 24480
  },
  'bellatrix-indoor-cob-p1.5': {
    endUser: 24300,
    reseller: 20655,
    channel: 21870
  },
  'bellatrix-indoor-smd-p1.25': {
    endUser: 21300,
    reseller: 18105,
    channel: 19170
  }
};

/**
 * Calculate correct total price using the same logic as the fixed QuoteModal
 */
function calculateCorrectTotalPrice(productDetails, userType, userTypeDisplayName) {
  const METERS_TO_FEET = 3.2808399;
  
  // Extract data from productDetails
  const productName = productDetails.product?.name || '';
  const cabinetGrid = productDetails.configuration?.cabinetGrid;
  const processor = productDetails.configuration?.processor;
  const config = productDetails.configuration?.displayConfig;
  
  // Get unit price based on product and user type
  let unitPrice = 0;
  const productKey = productDetails.product?.id || '';
  
  if (productPrices[productKey]) {
    if (userType === 'reseller') {
      unitPrice = productPrices[productKey].reseller;
    } else if (userType === 'siChannel') {
      unitPrice = productPrices[productKey].channel;
    } else {
      unitPrice = productPrices[productKey].endUser;
    }
  } else {
    unitPrice = 5300; // Default fallback
  }
  
  // Calculate quantity using config dimensions (same as PDF)
  let quantity = 0;
  
  if (productName.toLowerCase().includes('rental')) {
    // For rental series, calculate quantity as number of cabinets
    quantity = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
  } else {
    // For other products, calculate quantity in square feet - MATCH PDF EXACTLY
    if (config && config.width && config.height) {
      const widthInMeters = config.width / 1000;
      const heightInMeters = config.height / 1000;
      const widthInFeet = widthInMeters * METERS_TO_FEET;
      const heightInFeet = heightInMeters * METERS_TO_FEET;
      quantity = widthInFeet * heightInFeet;
      
      // Ensure quantity is reasonable
      quantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
    } else {
      quantity = 1;
    }
  }
  
  // Calculate subtotal (product price before GST)
  const subtotal = unitPrice * quantity;
  
  // Add processor price if available (before GST)
  let processorPrice = 0;
  if (processor && processorPrices[processor]) {
    if (userType === 'reseller') {
      processorPrice = processorPrices[processor].reseller;
    } else if (userType === 'siChannel') {
      processorPrice = processorPrices[processor].channel;
    } else {
      processorPrice = processorPrices[processor].endUser;
    }
  }
  
  // Calculate totals with GST (18%) - SAME LOGIC AS PDF
  // Product total (A)
  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;
  
  // Processor/Controller total (B)
  const gstProcessor = processorPrice * 0.18;
  const totalProcessor = processorPrice + gstProcessor;
  
  // GRAND TOTAL (A + B) - This matches the PDF exactly
  const grandTotal = totalProduct + totalProcessor;
  
  return Math.round(grandTotal);
}

async function fixExistingQuotations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all quotations
    const quotations = await Quotation.find({});
    console.log(`Found ${quotations.length} quotations to check`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const quotation of quotations) {
      try {
        console.log(`\nProcessing quotation: ${quotation.quotationId}`);
        console.log(`Current totalPrice: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
        
        // Calculate correct price
        const correctPrice = calculateCorrectTotalPrice(
          quotation.productDetails,
          quotation.userType,
          quotation.userTypeDisplayName
        );
        
        console.log(`Calculated correct price: ₹${correctPrice.toLocaleString('en-IN')}`);
        
        if (correctPrice !== quotation.totalPrice) {
          // Update the quotation with correct price
          await Quotation.updateOne(
            { _id: quotation._id },
            { totalPrice: correctPrice }
          );
          
          console.log(`✅ Updated quotation ${quotation.quotationId}`);
          console.log(`   Old price: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
          console.log(`   New price: ₹${correctPrice.toLocaleString('en-IN')}`);
          updatedCount++;
        } else {
          console.log(`✅ Quotation ${quotation.quotationId} already has correct price`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing quotation ${quotation.quotationId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`   Updated: ${updatedCount} quotations`);
    console.log(`   Errors: ${errorCount} quotations`);
    console.log(`   Total: ${quotations.length} quotations processed`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixExistingQuotations();
