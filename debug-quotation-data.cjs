#!/usr/bin/env node

/**
 * Script to debug quotation data and understand why prices are calculating incorrectly
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

async function debugQuotationData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the specific quotation mentioned by the user
    const specificQuotation = await Quotation.findOne({ 
      quotationId: 'ORION/2025/10/ANSHIKA TRIVEDI/702879' 
    });
    
    if (specificQuotation) {
      console.log('\n🔍 Found the specific quotation:');
      console.log(`Quotation ID: ${specificQuotation.quotationId}`);
      console.log(`Current totalPrice: ₹${specificQuotation.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
      console.log(`Product Name: ${specificQuotation.productName}`);
      console.log(`User Type: ${specificQuotation.userType}`);
      console.log(`User Type Display: ${specificQuotation.userTypeDisplayName}`);
      
      console.log('\n📋 Product Details Structure:');
      console.log(JSON.stringify(specificQuotation.productDetails, null, 2));
      
      // Extract key data
      const productDetails = specificQuotation.productDetails;
      console.log('\n🔍 Extracted Data:');
      console.log(`Product ID: ${productDetails.product?.id || 'N/A'}`);
      console.log(`Product Name: ${productDetails.product?.name || 'N/A'}`);
      console.log(`Cabinet Grid: ${JSON.stringify(productDetails.configuration?.cabinetGrid || 'N/A')}`);
      console.log(`Processor: ${productDetails.configuration?.processor || 'N/A'}`);
      console.log(`Display Config: ${JSON.stringify(productDetails.configuration?.displayConfig || 'N/A')}`);
      
    } else {
      console.log('❌ Specific quotation not found. Let me check recent quotations...');
      
      // Find recent quotations
      const recentQuotations = await Quotation.find({})
        .sort({ createdAt: -1 })
        .limit(5);
      
      console.log('\n📋 Recent Quotations:');
      for (const q of recentQuotations) {
        console.log(`\n${q.quotationId}:`);
        console.log(`  Product: ${q.productName}`);
        console.log(`  Price: ₹${q.totalPrice?.toLocaleString('en-IN') || 'N/A'}`);
        console.log(`  User Type: ${q.userType}`);
        
        // Show product details structure
        const productDetails = q.productDetails;
        console.log(`  Product ID: ${productDetails.product?.id || 'N/A'}`);
        console.log(`  Cabinet Grid: ${JSON.stringify(productDetails.configuration?.cabinetGrid || 'N/A')}`);
        console.log(`  Processor: ${productDetails.configuration?.processor || 'N/A'}`);
        console.log(`  Display Config: ${JSON.stringify(productDetails.configuration?.displayConfig || 'N/A')}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the debug
debugQuotationData();
