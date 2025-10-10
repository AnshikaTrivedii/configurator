import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import SalesUser from '../models/SalesUser.js';
import Quotation from '../models/Quotation.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { validateLogin, validateSetPassword, validateChangePassword } from '../middleware/validation.js';

// NOTE: This function is NOT used for displaying prices in the dashboard.
// The dashboard displays the stored totalPrice directly from the database,
// which was calculated using the correct PDF pricing logic when the quotation was saved.
// This function exists only for reference and potential future use.
function calculateCorrectPrice(quotation) {
  // IMPORTANT: Always return the stored price from the database
  // Do NOT recalculate prices for display - this can cause mismatches with the PDF
  return quotation.totalPrice || 0;
}

// Get product price using PDF logic
function getProductPriceForPdf(productDetails, userType = 'End User') {
  try {
    // Handle different product types
    if (productDetails.category?.toLowerCase().includes('rental') && productDetails.prices) {
      // For rental products, use cabinet pricing based on user type
      if (userType === 'Reseller') {
        return productDetails.prices.cabinet.reseller;
      } else if (userType === 'Channel') {
        return productDetails.prices.cabinet.siChannel;
      } else {
        return productDetails.prices.cabinet.endCustomer;
      }
    }
    
    // For regular products, use the appropriate price field based on user type
    if (userType === 'Reseller' && typeof productDetails.resellerPrice === 'number') {
      return productDetails.resellerPrice;
    } else if (userType === 'Channel' && typeof productDetails.siChannelPrice === 'number') {
      return productDetails.siChannelPrice;
    } else if (typeof productDetails.price === 'number') {
      return productDetails.price;
    } else if (typeof productDetails.price === 'string') {
      // Handle string prices by converting to number
      const parsedPrice = parseFloat(productDetails.price);
      return isNaN(parsedPrice) ? getDefaultProductPrice(productDetails) : parsedPrice;
    }
    
    // Fallback to default pricing based on product ID
    return getDefaultProductPrice(productDetails);
    
  } catch (error) {
    console.error('Error getting product price:', error);
    return getDefaultProductPrice(productDetails); // Fallback price
  }
}

// Get default product price based on product ID (for existing quotations without price data)
function getDefaultProductPrice(productDetails) {
  try {
    const productId = productDetails.productId || '';
    
    // Product pricing mapping based on product ID (from products.ts)
    const productPricing = {
      'bellatrix-indoor-cob-p1.25': {
        price: 28700,
        resellerPrice: 24395,
        siChannelPrice: 25830
      },
      'bellatrix-indoor-cob-p1.5': {
        price: 27200,
        resellerPrice: 23120,
        siChannelPrice: 24480
      },
      'transparent-front-glass-p6.25': {
        price: 24300,
        resellerPrice: 20600,
        siChannelPrice: 22000
      },
      'rigel-p3-outdoor': {
        price: 50000,
        resellerPrice: 42500,
        siChannelPrice: 45000
      },
      'rigel-p2.5-outdoor': {
        price: 75000,
        resellerPrice: 63750,
        siChannelPrice: 67500
      },
      'rigel-p1.8-outdoor': {
        price: 100000,
        resellerPrice: 85000,
        siChannelPrice: 90000
      },
      'rigel-p1.5-outdoor': {
        price: 125000,
        resellerPrice: 106250,
        siChannelPrice: 112500
      },
      'rigel-p1.25-outdoor': {
        price: 150000,
        resellerPrice: 127500,
        siChannelPrice: 135000
      },
      'rigel-p0.9-outdoor': {
        price: 200000,
        resellerPrice: 170000,
        siChannelPrice: 180000
      },
      'rigel-p3-indoor': {
        price: 40000,
        resellerPrice: 34000,
        siChannelPrice: 36000
      },
      'rigel-p2.5-indoor': {
        price: 60000,
        resellerPrice: 51000,
        siChannelPrice: 54000
      },
      'rigel-p1.8-indoor': {
        price: 80000,
        resellerPrice: 68000,
        siChannelPrice: 72000
      },
      'rigel-p1.5-indoor': {
        price: 100000,
        resellerPrice: 85000,
        siChannelPrice: 90000
      },
      'rigel-p1.25-indoor': {
        price: 120000,
        resellerPrice: 102000,
        siChannelPrice: 108000
      },
      'rigel-p0.9-indoor': {
        price: 160000,
        resellerPrice: 136000,
        siChannelPrice: 144000
      },
      'orion-p3.9': {
        price: 60000,
        resellerPrice: 51000,
        siChannelPrice: 54000
      },
      'orion-p3-outdoor-rigel': {
        price: 80000,
        resellerPrice: 68000,
        siChannelPrice: 72000
      }
    };
    
    const pricing = productPricing[productId];
    if (pricing) {
      // Return the appropriate price based on user type
      const userType = productDetails.userType || 'endUser';
      if (userType === 'reseller') {
        return pricing.resellerPrice || pricing.price || 5300;
      } else if (userType === 'siChannel') {
        return pricing.siChannelPrice || pricing.price || 5300;
      } else {
        return pricing.price || 5300;
      }
    }
    
    // If no specific pricing found, return default
    return 5300;
    
  } catch (error) {
    console.error('Error getting default product price:', error);
    return 5300;
  }
}

// Get processor price
function getProcessorPrice(processorName, userType = 'End User') {
  try {
    // Processor pricing based on user type
    const processorPrices = {
      'TB2': {
        endUser: 15000,
        reseller: 12000,
        channel: 10000
      },
      'TB40': {
        endUser: 25000,
        reseller: 20000,
        channel: 17000
      },
      'TB60': {
        endUser: 35000,
        reseller: 28000,
        channel: 24000
      },
      'VX1': {
        endUser: 20000,
        reseller: 16000,
        channel: 14000
      },
      'VX400': {
        endUser: 30000,
        reseller: 24000,
        channel: 21000
      },
      'VX400 Pro': {
        endUser: 35000,
        reseller: 28000,
        channel: 24000
      },
      'VX600': {
        endUser: 45000,
        reseller: 36000,
        channel: 31000
      },
      'VX600 Pro': {
        endUser: 50000,
        reseller: 40000,
        channel: 34000
      },
      'VX1000': {
        endUser: 65000,
        reseller: 52000,
        channel: 44000
      },
      'VX1000 Pro': {
        endUser: 70000,
        reseller: 56000,
        channel: 48000
      },
      '4K PRIME': {
        endUser: 100000,
        reseller: 80000,
        channel: 68000
      }
    };

    const processor = processorPrices[processorName];
    if (!processor) {
      return 0; // No processor price
    }

    if (userType === 'Reseller') {
      return processor.reseller;
    } else if (userType === 'Channel') {
      return processor.channel;
    } else {
      return processor.endUser;
    }
    
  } catch (error) {
    console.error('Error getting processor price:', error);
    return 0;
  }
}

const router = express.Router();

// POST /api/sales/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email with optimized query (only select necessary fields)
    const user = await SalesUser.findOne({ email: email.toLowerCase() })
      .select('email name location contactNumber passwordHash mustChangePassword passwordSetAt role')
      .lean(); // Use lean() for better performance
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password using bcrypt directly for better performance
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token with extended expiry for better session persistence
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        name: user.name,
        location: user.location,
        contactNumber: user.contactNumber,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' } // Extended to 30 days for better UX
    );

    // Return user data (excluding password hash)
    res.json({
      success: true,
      token,
      user: {
        name: user.name,
        location: user.location,
        contactNumber: user.contactNumber,
        email: user.email,
        role: user.role
      },
      mustChangePassword: user.mustChangePassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/sales/set-password (first-time password setup)
router.post('/set-password', authenticateToken, validateSetPassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id || req.user.id;

    // Find the user document (not lean) to access methods
    const user = await SalesUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = user.checkPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password
    user.setNewPassword(newPassword);
    await user.save();

    // Generate new JWT token
    const token = generateToken(user);

    // Return updated user data
    const userData = {
      name: user.name,
      location: user.location,
      contactNumber: user.contactNumber,
      email: user.email
    };

    res.json({
      success: true,
      token,
      user: {
        name: userData.name,
        location: userData.location,
        contactNumber: userData.contactNumber,
        email: userData.email
      },
      mustChangePassword: false
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/sales/change-password (change existing password)
router.post('/change-password', authenticateToken, validateChangePassword, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id || req.user.id;

    // Find the user document (not lean) to access methods
    const user = await SalesUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isOldPasswordValid = user.checkPassword(oldPassword);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    // Set new password
    user.setNewPassword(newPassword);
    await user.save();

    // Generate new JWT token
    const token = generateToken(user);

    // Return updated user data
    const userData = {
      name: user.name,
      location: user.location,
      contactNumber: user.contactNumber,
      email: user.email
    };

    res.json({
      success: true,
      token,
      user: {
        name: userData.name,
        location: userData.location,
        contactNumber: userData.contactNumber,
        email: userData.email
      },
      mustChangePassword: false
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/sales/profile (get current user profile)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      user: {
        name: user.name,
        location: user.location,
        contactNumber: user.contactNumber,
        email: user.email,
        role: user.role
      },
      mustChangePassword: user.mustChangePassword || false
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/sales/reset-password (temporary endpoint to reset password)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    // Simple secret key check (remove this endpoint after use)
    if (secretKey !== 'reset123') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Find user by email
    const user = await SalesUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset password to default
    const newPasswordHash = bcrypt.hashSync('Orion@123', 10);
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = true;
    user.passwordSetAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset to Orion@123 successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Test endpoint to verify routes are working
router.get('/test-routes', (req, res) => {
  res.json({
    success: true,
    message: 'Routes are working - UPDATED CODE VERSION',
    timestamp: new Date().toISOString(),
    version: 'v2.1.0'
  });
});

// Database connection test endpoint
router.get('/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection from server...');
    
    const mongoose = await import('mongoose');
    const { default: Quotation } = await import('../models/Quotation.js');
    
    // Test database connection
    const connectionState = mongoose.default.connection.readyState;
    const dbName = mongoose.default.connection.db.databaseName;
    const host = mongoose.default.connection.host;
    const port = mongoose.default.connection.port;
    
    console.log('📊 Database connection details:');
    console.log('   State:', connectionState);
    console.log('   Database:', dbName);
    console.log('   Host:', host);
    console.log('   Port:', port);
    
    // Test query
    const count = await Quotation.countDocuments();
    console.log('📊 Total quotations in database:', count);
    
    // Test creating a quotation
    const testQuotation = new Quotation({
      quotationId: 'DB-TEST-' + Date.now(),
      salesUserId: new mongoose.default.Types.ObjectId(),
      salesUserName: 'DB Test User',
      customerName: 'DB Test Customer',
      customerEmail: 'db@test.com',
      customerPhone: '9876543210',
      productName: 'DB Test Product',
      productDetails: { test: true },
      message: 'DB test',
      userType: 'endUser',
      userTypeDisplayName: 'DB Test User',
      status: 'New',
      totalPrice: 999999
    });
    
    console.log('💾 Attempting to save test quotation...');
    await testQuotation.save();
    console.log('✅ Test quotation saved successfully:', testQuotation.quotationId);
    
    // Verify it was saved
    const savedQuotation = await Quotation.findById(testQuotation._id);
    console.log('🔍 Verification - Quotation found:', !!savedQuotation);
    
    // Clean up
    await Quotation.deleteOne({ _id: testQuotation._id });
    console.log('🧹 Test quotation cleaned up');
    
    res.json({
      success: true,
      message: 'Database test successful',
      connectionState: connectionState,
      database: dbName,
      host: host,
      port: port,
      totalQuotations: count,
      testQuotationId: testQuotation.quotationId,
      verificationPassed: !!savedQuotation
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Simplified test quotation endpoint
router.post('/test-quotation', async (req, res) => {
  try {
    console.log('🧪 SIMPLE TEST: Received quotation request');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { default: Quotation } = await import('../models/Quotation.js');
    
    const quotation = new Quotation({
      quotationId: req.body.quotationId || 'SIMPLE-TEST-' + Date.now(),
      salesUserId: new mongoose.Types.ObjectId(),
      salesUserName: 'Simple Test User',
      customerName: req.body.customerName || 'Simple Test Customer',
      customerEmail: req.body.customerEmail || 'simple@test.com',
      customerPhone: req.body.customerPhone || '9876543210',
      productName: req.body.productName || 'Simple Test Product',
      productDetails: req.body.productDetails || { test: true },
      message: req.body.message || 'Simple test',
      userType: req.body.userType || 'endUser',
      userTypeDisplayName: req.body.userTypeDisplayName || 'Simple Test User',
      status: req.body.status || 'New',
      totalPrice: req.body.totalPrice || 100000
    });
    
    console.log('💾 SIMPLE TEST: Attempting to save quotation...');
    await quotation.save();
    
    console.log('✅ SIMPLE TEST: Quotation saved successfully:', quotation.quotationId);
    
    res.json({
      success: true,
      message: 'Simple test quotation saved successfully',
      quotationId: quotation.quotationId,
      totalPrice: quotation.totalPrice
    });
    
  } catch (error) {
    console.error('❌ SIMPLE TEST: Save error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Simple test save failed',
      error: error.message
    });
  }
});


// POST /api/sales/quotation (save quotation to database)
router.post('/quotation', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 ===== QUOTATION SAVE REQUEST START =====');
  console.log('⏰ Request timestamp:', new Date().toISOString());
  console.log('🌐 Request IP:', req.ip || req.connection.remoteAddress);
  console.log('🔑 Authorization header present:', !!req.headers.authorization);
  
  try {
    console.log('🔄 Received quotation save request');
    console.log('👤 Sales User:', req.user?.name, req.user?.email);
    console.log('👤 Sales User ID:', req.user?._id);
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      quotationId,
      customerName,
      customerEmail,
      customerPhone,
      productName,
      productDetails,
      message,
      userType,
      userTypeDisplayName,
      status,
      totalPrice,
      // New exact quotation data fields
      exactPricingBreakdown,
      exactProductSpecs,
      createdAt
    } = req.body;

    // Validate required fields
    if (!quotationId || !customerName || !customerEmail || !productName) {
      console.error('❌ Missing required fields:', {
        quotationId: !!quotationId,
        customerName: !!customerName,
        customerEmail: !!customerEmail,
        productName: !!productName
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: quotationId, customerName, customerEmail, productName'
      });
    }

    // Check if quotation ID already exists
    const existingQuotation = await Quotation.findOne({ quotationId });
    if (existingQuotation) {
      console.error('❌ Quotation ID already exists:', quotationId);
      return res.status(400).json({
        success: false,
        message: 'Quotation ID already exists'
      });
    }

    console.log('📤 Creating new quotation with ID:', quotationId);
    console.log('🔍 Quotation model check:', !!Quotation);
    console.log('🔍 Quotation constructor:', typeof Quotation);

    // Create new quotation with exact data as shown on the page
    const quotation = new Quotation({
      quotationId,
      salesUserId: req.user._id,
      salesUserName: req.user.name,
      customerName,
      customerEmail,
      customerPhone,
      productName,
      productDetails,
      message: message || '',
      userType,
      userTypeDisplayName,
      status: status || 'New',
      totalPrice: totalPrice || 0,
      // Store exact quotation data as shown on the page
      exactPricingBreakdown: exactPricingBreakdown || null,
      exactProductSpecs: exactProductSpecs || null,
      // Store the exact data as JSON for perfect reproduction
      quotationData: {
        exactPricingBreakdown,
        exactProductSpecs,
        createdAt: createdAt || new Date().toISOString(),
        savedAt: new Date().toISOString()
      }
    });

    console.log('💾 Attempting to save quotation to database...');
    console.log('📋 Quotation object before save:', JSON.stringify(quotation, null, 2));
    console.log('🔍 Database connection state:', mongoose.connection.readyState);
    
    // Write to file to verify code execution
    fs.writeFileSync('quotation-save-debug.txt', `QUOTATION SAVE ATTEMPT - ${new Date().toISOString()}\nQuotation ID: ${quotation.quotationId}\n`);
    
    try {
      const saveResult = await quotation.save();
      console.log('📊 Save result:', saveResult);
      
      // Write success to file
      fs.writeFileSync('quotation-save-debug.txt', `SUCCESS: Quotation saved with ID ${quotation.quotationId}\n`, { flag: 'a' });
    } catch (saveError) {
      console.error('❌ SAVE ERROR:', saveError);
      fs.writeFileSync('quotation-save-debug.txt', `ERROR: ${saveError.message}\n`, { flag: 'a' });
      throw saveError;
    }
    
    console.log('✅ DATABASE SAVE SUCCESSFUL!');
    console.log('🆔 Saved quotation ID:', quotation.quotationId);
    console.log('🆔 MongoDB document ID:', quotation._id);
    console.log('💰 Total price saved:', quotation.totalPrice);
    console.log('👤 Sales user ID:', quotation.salesUserId);
    console.log('📅 Created at:', quotation.createdAt);
    console.log('📊 Product details keys:', Object.keys(quotation.productDetails || {}));
    console.log('📊 Exact pricing breakdown saved:', !!quotation.exactPricingBreakdown);
    console.log('📊 Exact product specs saved:', !!quotation.exactProductSpecs);

    const response = {
      success: true,
      message: 'Quotation saved successfully',
      quotationId: quotation.quotationId,
      quotationData: {
        id: quotation._id,
        customerName: quotation.customerName,
        productName: quotation.productName,
        totalPrice: quotation.totalPrice,
        createdAt: quotation.createdAt
      }
    };
    
    console.log('📤 Sending success response:', JSON.stringify(response, null, 2));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log('⏱️ Request processing time:', duration + 'ms');
    console.log('🏁 ===== QUOTATION SAVE REQUEST COMPLETE =====');
    
    res.json(response);

  } catch (error) {
    console.error('❌ DATABASE SAVE FAILED!');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body that caused error:', JSON.stringify(req.body, null, 2));
    console.error('❌ Sales user info:', {
      id: req.user?._id,
      name: req.user?.name,
      email: req.user?.email
    });
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID already exists'
      });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log('⏱️ Request processing time (error):', duration + 'ms');
    console.log('🏁 ===== QUOTATION SAVE REQUEST FAILED =====');
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/sales/dashboard (Super User dashboard - get all sales users with quotation counts)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Check if user is a super user
    if (req.user.role !== 'super') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super User role required.'
      });
    }

    const { startDate, endDate, location } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Build location filter
    let locationFilter = {};
    if (location) {
      locationFilter.location = new RegExp(location, 'i');
    }

    // Get all sales users
    const salesUsers = await SalesUser.find(locationFilter)
      .select('name email location contactNumber createdAt role')
      .lean();

    // Get quotation counts for each user (all statuses)
    const usersWithQuotationCounts = await Promise.all(
      salesUsers.map(async (user) => {
        const quotationCount = await Quotation.countDocuments({
          salesUserId: user._id,
          ...dateFilter
        });

        // Get revenue only for 'Converted' quotations
        const revenueResult = await Quotation.aggregate([
          {
            $match: {
              salesUserId: user._id,
              status: 'Converted', // Only include converted quotations
              ...dateFilter
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalPrice' }
            }
          }
        ]);

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          location: user.location,
          contactNumber: user.contactNumber,
          quotationCount,
          revenue: revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0,
          createdAt: user.createdAt,
          role: user.role
        };
      })
    );

    // Sort by quotation count (descending)
    usersWithQuotationCounts.sort((a, b) => b.quotationCount - a.quotationCount);

    // Calculate top performers (users with the highest number of quotations)
    const validPerformers = usersWithQuotationCounts.filter(user => user.quotationCount > 0);
    const maxQuotationCount = validPerformers.length > 0 ? validPerformers[0].quotationCount : 0;
    const topPerformers = validPerformers.filter(user => user.quotationCount === maxQuotationCount);
    
    // Add additional statistics (only for 'Converted' quotations)
    const totalRevenue = await Quotation.aggregate([
      { 
        $match: { 
          status: 'Converted', // Only include converted quotations for total revenue
          ...dateFilter
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    const quotationsByMonth = await Quotation.aggregate([
      { 
        $match: { 
          status: 'Converted', // Only include converted quotations for monthly revenue
          ...dateFilter
        } 
      },
      { 
        $group: { 
          _id: { 
            year: { $year: '$createdAt' }, 
            month: { $month: '$createdAt' } 
          }, 
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        } 
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Calculate statistics
    const totalQuotations = usersWithQuotationCounts.reduce((sum, user) => sum + user.quotationCount, 0);
    const activeUsers = usersWithQuotationCounts.filter(user => user.quotationCount > 0).length;

    res.json({
      success: true,
      data: usersWithQuotationCounts,
      stats: {
        totalSalesPersons: usersWithQuotationCounts.length,
        totalQuotations: totalQuotations,
        activeUsers: activeUsers,
        topPerformers: topPerformers,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        averageQuotationsPerUser: activeUsers > 0 ? Math.round(totalQuotations / activeUsers) : 0,
        quotationsByMonth: quotationsByMonth
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        location: location || null
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/sales/salesperson/:id (Get sales person details with their quotations)
router.get('/salesperson/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is a super user
    if (req.user.role !== 'super') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super User role required.'
      });
    }

    const { id } = req.params;

    // Get sales person details
    const salesPerson = await SalesUser.findById(id)
      .select('name email location contactNumber role createdAt')
      .lean();

    if (!salesPerson) {
      return res.status(404).json({
        success: false,
        message: 'Sales person not found'
      });
    }

    // Get all quotations for this sales person
    const quotations = await Quotation.find({ salesUserId: id })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${quotations.length} quotations for salesperson ${id}`);

    // Group quotations by customer
    const customerMap = new Map();
    
    quotations.forEach(quotation => {
      const customerKey = `${quotation.customerEmail}-${quotation.customerName}`;
      
      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          customerName: quotation.customerName,
          customerEmail: quotation.customerEmail,
          customerPhone: quotation.customerPhone,
          userType: quotation.userType,
          userTypeDisplayName: quotation.userTypeDisplayName,
          quotations: []
        });
      }
      
      // CRITICAL: Use the stored price directly from the database
      // This price INCLUDES 18% GST and matches the PDF Grand Total exactly
      // Do NOT recalculate - always use the stored value to match the PDF
      console.log(`💰 Quotation ${quotation.quotationId}: Stored price = ₹${quotation.totalPrice?.toLocaleString('en-IN') || 'N/A'} (incl. GST)`);
      
      customerMap.get(customerKey).quotations.push({
        quotationId: quotation.quotationId,
        productName: quotation.productName,
        productDetails: quotation.productDetails,
        totalPrice: quotation.totalPrice, // Grand Total with 18% GST - matches PDF exactly
        status: quotation.status,
        message: quotation.message,
        userType: quotation.userType,
        userTypeDisplayName: quotation.userTypeDisplayName,
        createdAt: quotation.createdAt
      });
    });

    const customers = Array.from(customerMap.values());

    res.json({
      success: true,
      salesPerson: {
        _id: salesPerson._id,
        name: salesPerson.name,
        email: salesPerson.email,
        location: salesPerson.location,
        contactNumber: salesPerson.contactNumber,
        role: salesPerson.role,
        createdAt: salesPerson.createdAt
      },
      customers,
      totalQuotations: quotations.length,
      totalCustomers: customers.length
    });

  } catch (error) {
    console.error('Sales person details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check latest quotation ID for a specific user and date to prevent duplicates
router.post('/check-latest-quotation-id', async (req, res) => {
  try {
    console.log('🔍 Checking latest quotation ID...');
    const { firstName, year, month, day } = req.body;
    
    if (!firstName || !year || !month || !day) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: firstName, year, month, day' 
      });
    }
    
    console.log('📊 Checking for user:', firstName, 'on date:', `${day}/${month}/${year}`);
    
    // Create regex pattern to match quotation IDs for this user and date
    const pattern = new RegExp(`^ORION/${year}/${month}/${day}/${firstName.toUpperCase()}/\\d{3}$`);
    
    // Find the latest quotation ID matching this pattern
    const latestQuotation = await Quotation.findOne({
      quotationId: { $regex: pattern }
    }).sort({ quotationId: -1 });
    
    let latestSerial = 0;
    if (latestQuotation && latestQuotation.quotationId) {
      // Extract the serial number from the quotation ID
      const parts = latestQuotation.quotationId.split('/');
      if (parts.length === 6) {
        latestSerial = parseInt(parts[5], 10) || 0;
      }
      console.log('✅ Found latest quotation ID:', latestQuotation.quotationId, 'Serial:', latestSerial);
    } else {
      console.log('ℹ️ No existing quotations found for this user and date');
    }
    
    res.json({
      success: true,
      latestSerial,
      pattern: pattern.toString(),
      foundQuotation: latestQuotation ? latestQuotation.quotationId : null
    });
    
  } catch (error) {
    console.error('❌ Error checking latest quotation ID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check latest quotation ID',
      details: error.message 
    });
  }
});

export default router;

