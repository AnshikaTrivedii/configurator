#!/usr/bin/env node

/**
 * Script to check the most recent quotations and their data structure
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

async function checkLatestQuotations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the 10 most recent quotations
    const recentQuotations = await Quotation.find({})
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`\n📋 Found ${recentQuotations.length} recent quotations:`);
    
    for (const quotation of recentQuotations) {
      console.log(`\n🆔 ${quotation.quotationId}:`);
      console.log(`   Product: ${quotation.productName}`);
      console.log(`   Price: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
      console.log(`   User Type: ${quotation.userType}`);
      console.log(`   Created: ${quotation.createdAt}`);
      
      // Check if productDetails has the correct structure
      const productDetails = quotation.productDetails;
      if (productDetails) {
        console.log(`   Product ID: ${productDetails.product?.id || 'N/A'}`);
        console.log(`   Cabinet Grid: ${JSON.stringify(productDetails.configuration?.cabinetGrid || 'N/A')}`);
        console.log(`   Processor: ${productDetails.configuration?.processor || 'N/A'}`);
        console.log(`   Display Config: ${JSON.stringify(productDetails.configuration?.displayConfig || 'N/A')}`);
        
        // Check if it has the new structure
        if (productDetails.cabinetGrid) {
          console.log(`   ✅ Has cabinetGrid: ${JSON.stringify(productDetails.cabinetGrid)}`);
        }
        if (productDetails.processor) {
          console.log(`   ✅ Has processor: ${productDetails.processor}`);
        }
        if (productDetails.displaySize) {
          console.log(`   ✅ Has displaySize: ${JSON.stringify(productDetails.displaySize)}`);
        }
      } else {
        console.log(`   ❌ No productDetails found`);
      }
    }
    
    // Check for quotations created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayQuotations = await Quotation.find({
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });
    
    console.log(`\n📅 Quotations created today (${today.toDateString()}): ${todayQuotations.length}`);
    
    for (const quotation of todayQuotations) {
      console.log(`   ${quotation.quotationId}: ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'} - ${quotation.createdAt}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the check
checkLatestQuotations();
