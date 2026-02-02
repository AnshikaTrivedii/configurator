import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import SalesUser from '../models/SalesUser.js';
import Quotation from '../models/Quotation.js';
import Client from '../models/Client.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { validateLogin, validateSetPassword, validateChangePassword } from '../middleware/validation.js';
import { uploadPdfToS3, getPdfPresignedUrl } from '../utils/s3Service.js';

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
        endUser: 35000,
        reseller: 29800,
        channel: 31500
      },
      'TB40': {
        endUser: 35000,
        reseller: 29800,
        channel: 31500
      },
      'TB60': {
        endUser: 65000,
        reseller: 55300,
        channel: 58500
      },
      'VX1': {
        endUser: 35000,
        reseller: 29800,
        channel: 31500
      },
      'VX400': {
        endUser: 100000,
        reseller: 85000,
        channel: 90000
      },
      'VX400 Pro': {
        endUser: 110000,
        reseller: 93500,
        channel: 99000
      },
      'VX600': {
        endUser: 120000,
        reseller: 102000,
        channel: 108000
      },
      'VX600 Pro': {
        endUser: 130000,
        reseller: 110500,
        channel: 117000
      },
      'VX1000': {
        endUser: 150000,
        reseller: 127500,
        channel: 135000
      },
      'VX1000 Pro': {
        endUser: 160000,
        reseller: 136000,
        channel: 144000
      },
      '4K PRIME': {
        endUser: 290000,
        reseller: 246500,
        channel: 261000
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

// POST /api/sales/register (register new sales/partner user - admin only)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Check if user is a super_admin or super user
    if (req.user.role !== 'super' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.'
      });
    }

    const {
      email,
      password,
      name,
      location,
      contactNumber,
      role = 'sales',
      allowedCustomerTypes = []
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !location || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if user already exists
    const existingUser = await SalesUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 12);

    // Create new user
    const newUser = new SalesUser({
      email: email.toLowerCase(),
      name,
      location,
      contactNumber,
      passwordHash,
      role,
      allowedCustomerTypes: role === 'partner' ? allowedCustomerTypes : [],
      mustChangePassword: true,
      passwordSetAt: null
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/sales/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email with optimized query (only select necessary fields)
    // Include _id in select (it's included by default, but explicit for clarity)
    const user = await SalesUser.findOne({ email: email.toLowerCase() })
      .select('_id email name location contactNumber passwordHash mustChangePassword passwordSetAt role allowedCustomerTypes')
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

    // Ensure role is set (default to 'sales' if not set)
    // This handles cases where users were created before role field was added
    const userRole = user.role || 'sales';

    // Get allowed customer types for partners (empty array for non-partners)
    const allowedCustomerTypes = userRole === 'partner' ? (user.allowedCustomerTypes || []) : [];

    // Generate JWT token with extended expiry for better session persistence
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        location: user.location,
        contactNumber: user.contactNumber,
        role: userRole, // Always include role in token
        allowedCustomerTypes: allowedCustomerTypes // Include permissions for partners
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' } // Extended to 30 days for better UX
    );

    // Build user object for response - ALWAYS include role, permissions, and _id
    // _id is CRITICAL for saving quotations (used as salesUserId)
    // When using .lean(), _id is an ObjectId that needs to be converted to string
    if (!user._id) {
      console.error('❌ CRITICAL: User document missing _id field!', {
        userEmail: user.email,
        userKeys: Object.keys(user)
      });
      return res.status(500).json({
        success: false,
        message: 'Internal server error: User ID missing'
      });
    }

    const userResponse = {
      _id: user._id.toString(), // CRITICAL: Include _id for quotation attribution
      name: user.name,
      location: user.location,
      contactNumber: user.contactNumber,
      email: user.email,
      role: userRole, // CRITICAL: Always include role, default to 'sales' if not set
      allowedCustomerTypes: allowedCustomerTypes // Include permissions for partners
    };

    // CRITICAL: Verify userResponse has _id before sending
    if (!userResponse._id) {
      console.error('❌ CRITICAL: userResponse missing _id before sending!', {
        userResponse: userResponse,
        userResponseKeys: Object.keys(userResponse),
        userResponseStringified: JSON.stringify(userResponse)
      });
      return res.status(500).json({
        success: false,
        message: 'Internal server error: User ID missing in response'
      });
    }

    // Return user data (excluding password hash)
    const responsePayload = {
      success: true,
      token,
      user: userResponse,
      mustChangePassword: user.mustChangePassword
    };

    res.json(responsePayload);

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

    // Refresh user from database to ensure we have all fields (including allowedCustomerTypes)
    // Note: _id is always included by default in Mongoose queries
    const updatedUser = await SalesUser.findById(userId).select('_id email name location contactNumber role allowedCustomerTypes');
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after password update'
      });
    }

    // Get allowed customer types for partners
    const allowedCustomerTypes = updatedUser.role === 'partner' ? (updatedUser.allowedCustomerTypes || []) : [];

    // Generate new JWT token with updated user data (including permissions)
    const token = generateToken(updatedUser);

    // Return updated user data with role, permissions, and _id
    const userData = {
      _id: updatedUser._id.toString(), // CRITICAL: Include _id for quotation attribution
      name: updatedUser.name,
      location: updatedUser.location,
      contactNumber: updatedUser.contactNumber,
      email: updatedUser.email,
      role: updatedUser.role,
      allowedCustomerTypes: allowedCustomerTypes
    };

    res.json({
      success: true,
      token,
      user: userData,
      mustChangePassword: false
    });

  } catch (error) {
    console.error('Set password error:', error);
    console.error('Set password error stack:', error.stack);
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

    // CRITICAL: Ensure _id exists and convert to string
    if (!user._id) {
      console.error('❌ Profile: req.user missing _id!', {
        user: user,
        userKeys: Object.keys(user || {}),
        note: 'This should not happen - check authenticateToken middleware'
      });
      return res.status(500).json({
        success: false,
        message: 'Internal server error: User ID missing'
      });
    }

    // Get allowed customer types for partners
    const allowedCustomerTypes = user.role === 'partner' ? (user.allowedCustomerTypes || []) : [];

    // Convert _id to string (handles both ObjectId and string)
    const userIdString = typeof user._id === 'string' ? user._id : user._id.toString();

    res.json({
      success: true,
      user: {
        _id: userIdString, // CRITICAL: Include _id for quotation attribution
        name: user.name,
        location: user.location,
        contactNumber: user.contactNumber,
        email: user.email,
        role: user.role,
        allowedCustomerTypes: allowedCustomerTypes // Include permissions for partners
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

    const mongoose = await import('mongoose');
    const { default: Quotation } = await import('../models/Quotation.js');

    // Test database connection
    const connectionState = mongoose.default.connection.readyState;
    const dbName = mongoose.default.connection.db.databaseName;
    const host = mongoose.default.connection.host;
    const port = mongoose.default.connection.port;

    // Test query
    const count = await Quotation.countDocuments();

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
      totalPrice: 999999
    });

    await testQuotation.save();

    // Verify it was saved
    const savedQuotation = await Quotation.findById(testQuotation._id);

    // Clean up
    await Quotation.deleteOne({ _id: testQuotation._id });

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
      totalPrice: req.body.totalPrice || 100000
    });

    await quotation.save();

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


// Public route for Clients to request quotes (No Auth)
router.post('/public/quotation', async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerProject,
      customerLocation,
      productName,
      productDetails,
      message,
      quotationData,
      totalPrice,
      originalTotalPrice,
      exactPricingBreakdown,
      originalPricingBreakdown,
      exactProductSpecs,
      pdfBase64
    } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !productName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and product information are required'
      });
    }

    // 1. Find or Create Client
    let client = await Client.findOne({ email: customerEmail.toLowerCase().trim() });

    if (!client) {
      client = new Client({
        name: customerName.trim(),
        email: customerEmail.toLowerCase().trim(),
        phone: customerPhone?.trim() || '',
        projectTitle: customerProject?.trim() || '',
        location: customerLocation?.trim() || '',
        company: '',
        notes: 'Created via Public Quote Request'
      });
      await client.save();
    } else {
      // Update client info if provided
      if (customerProject) client.projectTitle = customerProject.trim();
      if (customerLocation) client.location = customerLocation.trim();
      if (customerPhone) client.phone = customerPhone.trim();
      await client.save();
    }

    // 2. Generate Quotation ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Quotation.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    const quotationId = `Q-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    // 3. Handle PDF Upload
    let pdfS3Key = null;
    let pdfS3Url = null;

    if (pdfBase64) {
      try {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        pdfS3Key = await uploadPdfToS3(pdfBuffer, quotationId, 'unassigned');
        pdfS3Url = await getPdfPresignedUrl(pdfS3Key, 3600);
      } catch (s3Error) {
        console.error('Error uploading public PDF to S3:', s3Error);
      }
    }

    // 4. Create Quotation with salesUserId: null
    const quotation = new Quotation({
      quotationId,
      salesUserId: null,
      salesUserName: 'Unassigned',
      clientId: client._id,
      customerName: client.name,
      customerEmail: client.email,
      customerPhone: client.phone,
      productName,
      productDetails,
      message: message || 'Web Request',
      userType: 'endUser',
      userTypeDisplayName: 'End User',
      totalPrice: totalPrice || 0,
      originalTotalPrice: originalTotalPrice || 0,
      exactPricingBreakdown,
      originalPricingBreakdown,
      exactProductSpecs,
      quotationData: quotationData || {
        exactPricingBreakdown,
        exactProductSpecs,
        config: productDetails?.config || null,
        createdAt: new Date().toISOString(),
        savedAt: new Date().toISOString()
      },
      pdfPage6HTML: req.body.pdfPage6HTML || null,
      pdfS3Key,
      pdfS3Url
    });

    await quotation.save();

    res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully',
      quotation: {
        quotationId: quotation.quotationId,
        client: {
          name: client.name,
          email: client.email
        }
      }
    });

  } catch (error) {
    console.error('Error in public quote request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error processing quote request',
      error: error.message
    });
  }
});

// POST /api/sales/quotation (save quotation to database)
router.post('/quotation', authenticateToken, async (req, res) => {
  const startTime = Date.now();

  try {

    // Check if user has permission to create quotations
    // Partners are allowed to create quotations just like sales users
    const allowedRoles = ['sales', 'partner', 'super', 'super_admin', 'superadmin', 'admin'];
    if (!allowedRoles.includes(req.user?.role)) {
      console.error('❌ Access denied - Invalid role:', req.user?.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Sales, Partner, Super Admin, or Admin role required to create quotations.'
      });
    }

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
      totalPrice,
      originalTotalPrice, // Added field
      // New exact quotation data fields
      exactPricingBreakdown,
      originalPricingBreakdown, // Added field
      exactProductSpecs,
      pdfPage6HTML,
      createdAt,
      // PDF data (base64 encoded)
      pdfBase64,
      // Allow superadmin to specify salesUserId and salesUserName
      // CRITICAL: These fields determine quotation attribution in dashboard
      salesUserId: providedSalesUserId,
      salesUserName: providedSalesUserName,
      // Client reference
      clientId
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

    // Check if quotation ID already exists (safety check)
    const existingQuotation = await Quotation.findOne({ quotationId });
    if (existingQuotation) {
      console.error('❌ Quotation ID already exists:', quotationId);
      return res.status(400).json({
        success: false,
        message: 'Quotation ID already exists. Please try saving again to generate a new unique ID.'
      });
    }

    // CRITICAL: Determine salesUserId and salesUserName for quotation attribution
    // This field determines which user the quotation is counted under in the dashboard
    // EXACT LOGIC (DO NOT DEVIATE):
    //   - If req.body.salesUserId is provided → Super user assigned someone → use that
    //   - Otherwise → No assignment → owner is the logged-in user
    let finalSalesUserId;
    let finalSalesUserName;

    if (req.body.salesUserId) {
      // Super user assigned someone
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(req.body.salesUserId)) {
        console.error('❌ Invalid salesUserId format (not a valid ObjectId):', req.body.salesUserId);
        return res.status(400).json({
          success: false,
          message: 'Invalid salesUserId format. Must be a valid MongoDB ObjectId.'
        });
      }

      // Convert to ObjectId and validate user exists
      const salesUserIdToFind = new mongoose.Types.ObjectId(req.body.salesUserId);
      const assignedUser = await SalesUser.findById(salesUserIdToFind);

      if (!assignedUser) {
        console.error('❌ Provided salesUserId does not exist:', req.body.salesUserId);
        return res.status(400).json({
          success: false,
          message: 'Invalid salesUserId. The specified sales user does not exist.'
        });
      }

      // Use the assigned user's ID (as ObjectId) and name
      finalSalesUserId = assignedUser._id; // Already an ObjectId from database
      finalSalesUserName = req.body.salesUserName || assignedUser.name;

    } else {
      // No assignment → owner is the logged-in user
      finalSalesUserId = req.user._id;
      finalSalesUserName = req.user.name;

    }

    // CRITICAL: Ensure finalSalesUserId is an ObjectId before saving
    if (!(finalSalesUserId instanceof mongoose.Types.ObjectId)) {
      try {
        finalSalesUserId = new mongoose.Types.ObjectId(finalSalesUserId);
      } catch (conversionError) {
        console.error('❌ Failed to convert salesUserId to ObjectId:', conversionError);
        return res.status(400).json({
          success: false,
          message: 'Invalid salesUserId format. Cannot convert to ObjectId.'
        });
      }
    }

    // Validate clientId if provided
    let validatedClientId = null;
    if (clientId) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        console.error('❌ Invalid clientId format (not a valid ObjectId):', clientId);
        return res.status(400).json({
          success: false,
          message: 'Invalid clientId format. Must be a valid MongoDB ObjectId.'
        });
      }
      validatedClientId = new mongoose.Types.ObjectId(clientId);
      console.log('✅ Valid clientId provided:', validatedClientId.toString());
    }

    // Log final assignment BEFORE save

    // Upload PDF to S3 if provided
    let pdfS3Key = null;
    let pdfS3Url = null;

    if (pdfBase64) {
      try {

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // Upload to S3
        pdfS3Key = await uploadPdfToS3(pdfBuffer, quotationId, finalSalesUserId.toString());

        // Generate presigned URL (valid for 1 hour, can be regenerated when needed)
        pdfS3Url = await getPdfPresignedUrl(pdfS3Key, 3600);

      } catch (s3Error) {
        console.error('❌ Error uploading PDF to S3:', s3Error);
        console.error('❌ S3 Error details:', {
          message: s3Error.message,
          stack: s3Error.stack,
          name: s3Error.name
        });
        // Don't fail the quotation save if S3 upload fails
        // PDF can be uploaded later via separate endpoint
        console.warn('⚠️ Continuing with quotation save without S3 PDF');
        // Set to null explicitly
        pdfS3Key = null;
        pdfS3Url = null;
      }
    } else {

    }

    // Create new quotation with exact data as shown on the page
    const quotation = new Quotation({
      quotationId,
      salesUserId: finalSalesUserId,  // CRITICAL: Must be ObjectId for proper matching
      salesUserName: finalSalesUserName,
      clientId: validatedClientId,  // Client reference
      customerName,
      customerEmail,
      customerPhone,
      productName,
      productDetails,
      message: message || '',
      userType,
      userTypeDisplayName,
      totalPrice: totalPrice || 0,
      originalTotalPrice: originalTotalPrice || totalPrice || 0, // Fallback to totalPrice if original is missing
      // Store exact quotation data as shown on the page
      exactPricingBreakdown: exactPricingBreakdown || null,
      originalPricingBreakdown: originalPricingBreakdown || null, // Capture original
      exactProductSpecs: exactProductSpecs || null,
      // Store the exact PDF HTML that was displayed when quotation was created
      pdfPage6HTML: pdfPage6HTML || null,
      // S3 PDF storage
      pdfS3Key: pdfS3Key || null,
      pdfS3Url: pdfS3Url || null,
      // Store the exact data as JSON for perfect reproduction
      quotationData: {
        exactPricingBreakdown,
        exactProductSpecs,
        config: productDetails?.config || null,
        createdAt: createdAt || new Date().toISOString(),
        savedAt: new Date().toISOString()
      }
    });

    // Write to file to verify code execution
    fs.writeFileSync('quotation-save-debug.txt', `QUOTATION SAVE ATTEMPT - ${new Date().toISOString()}\nQuotation ID: ${quotation.quotationId}\n`);

    try {
      const saveResult = await quotation.save();

      // Write success to file
      fs.writeFileSync('quotation-save-debug.txt', `SUCCESS: Quotation saved with ID ${quotation.quotationId}\n`, { flag: 'a' });
    } catch (saveError) {
      console.error('❌ SAVE ERROR:', saveError);
      fs.writeFileSync('quotation-save-debug.txt', `ERROR: ${saveError.message}\n`, { flag: 'a' });
      throw saveError;
    }

    // CRITICAL: Verify the saved quotation has correct salesUserId
    const savedQuotation = await Quotation.findById(quotation._id);
    if (savedQuotation) {

      if (savedQuotation.salesUserId.toString() !== finalSalesUserId.toString()) {
        console.error('❌ CRITICAL ERROR: Saved salesUserId does not match expected!', {
          expected: finalSalesUserId.toString(),
          actual: savedQuotation.salesUserId.toString()
        });
      }
    }

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

    const endTime = Date.now();
    const duration = endTime - startTime;

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

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/sales/quotation/:quotationId (Update existing quotation)
router.put('/quotation/:quotationId', authenticateToken, async (req, res) => {
  const startTime = Date.now();

  try {
    const { quotationId } = req.params;
    const updateData = req.body;

    // Find the existing quotation
    const quotation = await Quotation.findOne({ quotationId });

    if (!quotation) {

      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check permissions - only the owner or super admin can update
    // For updates, we generally want to allow the "salesUserId" stored in the quotation to update it
    const isOwner = quotation.salesUserId.toString() === req.user._id.toString();
    const isSuperAdmin = ['super', 'super_admin', 'superadmin', 'admin'].includes(req.user.role);

    if (!isOwner && !isSuperAdmin) {

      return res.status(403).json({
        success: false,
        message: 'Access denied. Only quotation owner or super admin can update this quotation.'
      });
    }

    // Handle PDF upload/replacement if new PDF data is provided
    let pdfS3Key = quotation.pdfS3Key;
    let pdfS3Url = quotation.pdfS3Url;

    if (updateData.pdfBase64) {

      try {
        const pdfBuffer = Buffer.from(updateData.pdfBase64, 'base64');

        // Upload to S3 (this will overwrite if key is the same)
        // We use the existing logic to generate/reuse the key
        // Ideally we keep the same key structure
        pdfS3Key = await uploadPdfToS3(
          pdfBuffer,
          quotationId,
          quotation.salesUserId.toString()
        );

        // Generate new presigned URL
        pdfS3Url = await getPdfPresignedUrl(pdfS3Key, 3600);

      } catch (s3Error) {
        console.error('❌ Error updating PDF in S3:', s3Error);
        // We proceed with the update but warn about S3 failure
      }
    }

    // Update fields
    // We only update specific allowed fields to ensure data integrity
    if (updateData.totalPrice !== undefined) quotation.totalPrice = updateData.totalPrice;
    if (updateData.originalTotalPrice !== undefined) quotation.originalTotalPrice = updateData.originalTotalPrice;
    if (updateData.exactPricingBreakdown !== undefined) quotation.exactPricingBreakdown = updateData.exactPricingBreakdown;
    if (updateData.originalPricingBreakdown !== undefined) quotation.originalPricingBreakdown = updateData.originalPricingBreakdown;
    if (updateData.exactProductSpecs !== undefined) quotation.exactProductSpecs = updateData.exactProductSpecs;

    // Update customer information fields
    if (updateData.customerName !== undefined) quotation.customerName = updateData.customerName;
    if (updateData.customerEmail !== undefined) quotation.customerEmail = updateData.customerEmail;
    if (updateData.customerPhone !== undefined) quotation.customerPhone = updateData.customerPhone;
    if (updateData.message !== undefined) quotation.message = updateData.message;
    if (updateData.userType !== undefined) quotation.userType = updateData.userType;
    if (updateData.userTypeDisplayName !== undefined) quotation.userTypeDisplayName = updateData.userTypeDisplayName;

    // Update clientId if provided
    if (updateData.clientId !== undefined) {
      if (updateData.clientId) {
        // Validate clientId format if provided
        if (!mongoose.Types.ObjectId.isValid(updateData.clientId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid clientId format. Must be a valid MongoDB ObjectId.'
          });
        }
        quotation.clientId = new mongoose.Types.ObjectId(updateData.clientId);
        console.log('✅ Updated clientId:', quotation.clientId.toString());
      } else {
        // Allow clearing clientId by setting to null
        quotation.clientId = null;
        console.log('ℹ️ Cleared clientId');
      }
    }

    if (updateData.quotationData !== undefined) {
      // Merge existing quotationData with updates
      quotation.quotationData = {
        ...quotation.quotationData,
        ...updateData.quotationData,
        updatedAt: new Date().toISOString()
      };
    }

    // Update PDF related fields
    if (updateData.pdfBase64) {
      quotation.pdfS3Key = pdfS3Key;
      quotation.pdfS3Url = pdfS3Url;
      // Also update stored HTML if provided (backup)
      if (updateData.pdfPage6HTML) quotation.pdfPage6HTML = updateData.pdfPage6HTML;
    }

    // Save the updated quotation
    const savedQuotation = await quotation.save();

    res.json({
      success: true,
      message: 'Quotation updated successfully',
      quotation: {
        quotationId: savedQuotation.quotationId,
        totalPrice: savedQuotation.totalPrice,
        pdfS3Url: savedQuotation.pdfS3Url
      }
    });

    const endTime = Date.now();

  } catch (error) {
    console.error('❌ Error updating quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quotation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/sales/quotation/:quotationId (Delete a quotation)
router.delete('/quotation/:quotationId', authenticateToken, async (req, res) => {

  try {
    const { quotationId } = req.params;

    // Find the quotation
    const quotation = await Quotation.findOne({ quotationId });

    if (!quotation) {

      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check permissions:
    // 1. Super admin can delete any quotation
    // 2. Sales users can delete only their own quotations
    const isSuperAdmin = ['super', 'super_admin', 'superadmin', 'admin'].includes(req.user.role);
    const userId = req.user._id || req.user.id;

    if (!isSuperAdmin) {
      // For sales users: check if quotation belongs to them
      if (!quotation.salesUserId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Quotation ownership cannot be verified.'
        });
      }

      // Convert both to strings for comparison
      const quotationOwnerId = quotation.salesUserId.toString();
      const currentUserId = userId.toString();

      if (quotationOwnerId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own quotations.'
        });
      }
    }

    // Delete the quotation
    await Quotation.deleteOne({ quotationId });

    res.json({
      success: true,
      message: 'Quotation deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quotation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/sales/quotation/:quotationId/upload-pdf (Upload PDF to S3 for existing quotation)
router.post('/quotation/:quotationId/upload-pdf', authenticateToken, async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'PDF data (pdfBase64) is required'
      });
    }

    // Find the quotation
    const quotation = await Quotation.findOne({ quotationId });
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check permissions - only the owner or super admin can upload PDF
    const isOwner = quotation.salesUserId.toString() === req.user._id.toString();
    const isSuperAdmin = ['super', 'super_admin', 'superadmin', 'admin'].includes(req.user.role);

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only quotation owner or super admin can upload PDF.'
      });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Upload to S3
    const pdfS3Key = await uploadPdfToS3(
      pdfBuffer,
      quotationId,
      quotation.salesUserId.toString()
    );

    // Generate presigned URL
    const pdfS3Url = await getPdfPresignedUrl(pdfS3Key, 3600);

    // Update quotation with S3 info
    quotation.pdfS3Key = pdfS3Key;
    quotation.pdfS3Url = pdfS3Url;
    await quotation.save();

    res.json({
      success: true,
      message: 'PDF uploaded to S3 successfully',
      pdfS3Key,
      pdfS3Url
    });
  } catch (error) {
    console.error('❌ Error uploading PDF to S3:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload PDF to S3',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/sales/quotation/:quotationId/pdf-url (Get presigned URL for PDF)
router.get('/quotation/:quotationId/pdf-url', authenticateToken, async (req, res) => {
  try {
    const { quotationId } = req.params;

    // Find the quotation
    const quotation = await Quotation.findOne({ quotationId });
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check permissions
    const isOwner = quotation.salesUserId.toString() === req.user._id.toString();
    const isSuperAdmin = ['super', 'super_admin', 'superadmin', 'admin'].includes(req.user.role);

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only quotation owner or super admin can access PDF.'
      });
    }

    if (!quotation.pdfS3Key) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in S3. The quotation may not have a PDF uploaded yet.'
      });
    }

    // Generate new presigned URL (expires in 1 hour)
    const pdfS3Url = await getPdfPresignedUrl(quotation.pdfS3Key, 3600);

    res.json({
      success: true,
      pdfS3Url,
      pdfS3Key: quotation.pdfS3Key
    });
  } catch (error) {
    console.error('❌ Error generating PDF URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF URL',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/sales/dashboard (Dashboard - get all sales users with quotation counts)
// Accessible by both super users and sales users
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Allow super_admin and super users to access admin dashboard
    if (req.user.role !== 'super' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.'
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

    // Get all sales users and partners (includes both roles)
    // Partners are included so their quotations appear in the dashboard
    const salesUsers = await SalesUser.find(locationFilter)
      .select('name email location contactNumber createdAt role allowedCustomerTypes')
      .lean();

    // CRITICAL: Get quotation counts for each user
    // Uses salesUserId field in quotations to determine attribution
    // This ensures quotations assigned by superadmin to other users are counted correctly
    const usersWithQuotationCounts = await Promise.all(
      salesUsers.map(async (user) => {
        // CRITICAL: Convert user._id to ObjectId for proper comparison
        // user._id from .lean() might be a string, but quotation.salesUserId is ObjectId
        const userIdForQuery = user._id instanceof mongoose.Types.ObjectId
          ? user._id
          : new mongoose.Types.ObjectId(user._id.toString());

        // Count quotations where salesUserId matches this user
        // This is the authoritative field for quotation attribution
        const quotationCount = await Quotation.countDocuments({
          salesUserId: userIdForQuery,  // Use ObjectId for proper matching
          ...dateFilter
        });

        // Calculate revenue from quotations where salesUserId matches this user
        // CRITICAL: Uses salesUserId, not the user who created the quotation
        const revenueResult = await Quotation.aggregate([
          {
            $match: {
              salesUserId: userIdForQuery,  // Attribution based on salesUserId (as ObjectId)
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

        // Debug logging for specific user (Rajneesh Rawat)
        if (user.name && user.name.toLowerCase().includes('rajneesh')) {

          // Also check raw quotations for debugging
          const debugQuotations = await Quotation.find({ salesUserId: userIdForQuery }).select('quotationId salesUserId totalPrice createdAt').lean();

        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          location: user.location,
          contactNumber: user.contactNumber,
          quotationCount,  // Count based on salesUserId
          revenue: revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0,  // Revenue based on salesUserId
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

    // Add additional statistics
    const totalRevenue = await Quotation.aggregate([
      {
        $match: {
          ...dateFilter
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const quotationsByMonth = await Quotation.aggregate([
      {
        $match: {
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

// GET /api/sales/my-dashboard (Get current sales user's own dashboard data)
router.get('/my-dashboard', authenticateToken, async (req, res) => {
  try {
    // Only sales users can access their own dashboard
    if (req.user.role !== 'sales') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Sales role required.'
      });
    }

    const userId = req.user._id || req.user.id;

    // Get all quotations for this sales user
    const quotations = await Quotation.find({ salesUserId: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Group quotations by customer
    // First, collect all unique clientIds
    const clientIds = [...new Set(quotations.map(q => q.clientId).filter(id => id))];

    // Fetch all clients in one query
    const clientsMap = new Map();
    if (clientIds.length > 0) {
      const clients = await Client.find({ _id: { $in: clientIds } }).lean();
      clients.forEach(client => {
        clientsMap.set(client._id.toString(), client);
      });
    }

    const customerMap = new Map();

    let totalRevenue = 0;

    quotations.forEach(quotation => {
      // Use clientId as key if available, otherwise use email-name combination
      let customerKey;
      let customerName, customerEmail, customerPhone;

      if (quotation.clientId) {
        const clientIdStr = quotation.clientId.toString();
        const client = clientsMap.get(clientIdStr);
        if (client) {
          // Use client data from Client collection (most up-to-date)
          customerKey = clientIdStr;
          customerName = client.name || quotation.customerName;
          customerEmail = client.email || quotation.customerEmail;
          customerPhone = client.phone || quotation.customerPhone;
        } else {
          // Client not found, fallback to quotation data
          customerKey = `${quotation.customerEmail}-${quotation.customerName}`;
          customerName = quotation.customerName;
          customerEmail = quotation.customerEmail;
          customerPhone = quotation.customerPhone;
        }
      } else {
        // No clientId, use quotation data
        customerKey = `${quotation.customerEmail}-${quotation.customerName}`;
        customerName = quotation.customerName;
        customerEmail = quotation.customerEmail;
        customerPhone = quotation.customerPhone;
      }

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          userType: quotation.userType,
          userTypeDisplayName: quotation.userTypeDisplayName,
          quotations: []
        });
      }

      totalRevenue += quotation.totalPrice || 0;

      customerMap.get(customerKey).quotations.push({
        quotationId: quotation.quotationId,
        productName: quotation.productName,
        productDetails: quotation.productDetails,
        totalPrice: quotation.totalPrice,
        message: quotation.message,
        userType: quotation.userType,
        userTypeDisplayName: quotation.userTypeDisplayName,
        createdAt: quotation.createdAt,
        clientId: quotation.clientId || null,
        pdfPage6HTML: quotation.pdfPage6HTML || null,
        pdfS3Key: quotation.pdfS3Key || null,
        pdfS3Url: quotation.pdfS3Url || null,
        exactPricingBreakdown: quotation.exactPricingBreakdown || null,
        originalPricingBreakdown: quotation.originalPricingBreakdown || null,
        originalTotalPrice: quotation.originalTotalPrice || null,
        exactProductSpecs: quotation.exactProductSpecs || null,
        quotationData: quotation.quotationData || null
      });
    });

    const customers = Array.from(customerMap.values());

    res.json({
      success: true,
      salesPerson: {
        _id: userId,
        name: req.user.name,
        email: req.user.email,
        location: req.user.location,
        contactNumber: req.user.contactNumber,
        role: req.user.role
      },
      customers,
      totalQuotations: quotations.length,
      totalCustomers: customers.length,
      totalRevenue
    });

  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/sales/salesperson/:id (Get sales person details with their quotations)
router.get('/salesperson/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is a super_admin or super user
    if (req.user.role !== 'super' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.'
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

    // CRITICAL: Get all quotations for this sales person
    // Uses salesUserId field to ensure correct attribution
    // This includes quotations assigned to this user by superadmin
    // Convert id to ObjectId for proper matching

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('❌ Invalid ObjectId format for salesperson ID:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid salesperson ID format'
      });
    }

    const userIdForQuery = new mongoose.Types.ObjectId(id);

    const quotations = await Quotation.find({ salesUserId: userIdForQuery })
      .sort({ createdAt: -1 })
      .lean();

    // Group quotations by customer
    // First, collect all unique clientIds
    const clientIds = [...new Set(quotations.map(q => q.clientId).filter(id => id))];

    // Fetch all clients in one query
    const clientsMap = new Map();
    if (clientIds.length > 0) {
      const clients = await Client.find({ _id: { $in: clientIds } }).lean();
      clients.forEach(client => {
        clientsMap.set(client._id.toString(), client);
      });
    }

    const customerMap = new Map();

    quotations.forEach(quotation => {
      // Use clientId as key if available, otherwise use email-name combination
      let customerKey;
      let customerName, customerEmail, customerPhone;

      if (quotation.clientId) {
        const clientIdStr = quotation.clientId.toString();
        const client = clientsMap.get(clientIdStr);
        if (client) {
          // Use client data from Client collection (most up-to-date)
          customerKey = clientIdStr;
          customerName = client.name || quotation.customerName;
          customerEmail = client.email || quotation.customerEmail;
          customerPhone = client.phone || quotation.customerPhone;
        } else {
          // Client not found, fallback to quotation data
          customerKey = `${quotation.customerEmail}-${quotation.customerName}`;
          customerName = quotation.customerName;
          customerEmail = quotation.customerEmail;
          customerPhone = quotation.customerPhone;
        }
      } else {
        // No clientId, use quotation data
        customerKey = `${quotation.customerEmail}-${quotation.customerName}`;
        customerName = quotation.customerName;
        customerEmail = quotation.customerEmail;
        customerPhone = quotation.customerPhone;
      }

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          userType: quotation.userType,
          userTypeDisplayName: quotation.userTypeDisplayName,
          quotations: []
        });
      }

      // CRITICAL: Use the stored price directly from the database
      // This price INCLUDES 18% GST and matches the PDF Grand Total exactly
      // Do NOT recalculate - always use the stored value to match the PDF

      customerMap.get(customerKey).quotations.push({
        quotationId: quotation.quotationId,
        productName: quotation.productName,
        productDetails: quotation.productDetails,
        totalPrice: quotation.totalPrice, // Grand Total with 18% GST - matches PDF exactly
        message: quotation.message,
        userType: quotation.userType,
        userTypeDisplayName: quotation.userTypeDisplayName,
        createdAt: quotation.createdAt,
        clientId: quotation.clientId || null,
        pdfS3Key: quotation.pdfS3Key || null,
        pdfS3Url: quotation.pdfS3Url || null,
        exactPricingBreakdown: quotation.exactPricingBreakdown || null,
        originalPricingBreakdown: quotation.originalPricingBreakdown || null,
        originalTotalPrice: quotation.originalTotalPrice || null,
        exactProductSpecs: quotation.exactProductSpecs || null,
        quotationData: quotation.quotationData || null
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

// Generate globally unique quotation ID with atomic serial number generation
router.post('/generate-quotation-id', async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {

      const { firstName, year, month, day } = req.body;

      if (!firstName || !year || !month || !day) {
        throw new Error('Missing required fields: firstName, year, month, day');
      }

      // Step 1: Get the highest serial number ever used in ANY quotation ID
      const latestQuotation = await Quotation.findOne({
        quotationId: { $regex: /^ORION\/\d{4}\/\d{2}\/\d{2}\/[A-Z]+\/\d{3}$/ }
      }).sort({ quotationId: -1 }).session(session);

      let nextSerial = 1; // Default to 001 if no quotations exist

      if (latestQuotation && latestQuotation.quotationId) {
        // Extract the serial number from the latest quotation ID
        const parts = latestQuotation.quotationId.split('/');
        if (parts.length === 6) {
          const lastSerial = parseInt(parts[5], 10) || 0;
          nextSerial = lastSerial + 1;
        }

      } else {

      }

      // Step 2: Generate the new quotation ID
      const serial = nextSerial.toString().padStart(3, '0');
      const quotationId = `ORION/${year}/${month}/${day}/${firstName.toUpperCase()}/${serial}`;

      // Step 3: Safety check - verify the new ID doesn't already exist
      const existingQuotation = await Quotation.findOne({ quotationId }).session(session);
      if (existingQuotation) {
        // If ID exists, find the next available serial number

        // Get all quotations with the same prefix (ORION/YYYY/MM/DD/FIRSTNAME/)
        const prefix = `ORION/${year}/${month}/${day}/${firstName.toUpperCase()}/`;
        const existingQuotations = await Quotation.find({
          quotationId: { $regex: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d{3}$`) }
        }).sort({ quotationId: -1 }).session(session);

        let maxSerial = 0;
        existingQuotations.forEach(q => {
          const parts = q.quotationId.split('/');
          if (parts.length === 6) {
            const serialNum = parseInt(parts[5], 10) || 0;
            maxSerial = Math.max(maxSerial, serialNum);
          }
        });

        nextSerial = maxSerial + 1;
        const newSerial = nextSerial.toString().padStart(3, '0');
        const newQuotationId = `ORION/${year}/${month}/${day}/${firstName.toUpperCase()}/${newSerial}`;

        res.json({
          success: true,
          quotationId: newQuotationId,
          serial: newSerial,
          isGloballyUnique: true,
          message: 'Globally unique quotation ID generated successfully'
        });
      } else {

        res.json({
          success: true,
          quotationId,
          serial,
          isGloballyUnique: true,
          message: 'Globally unique quotation ID generated successfully'
        });
      }
    });

  } catch (error) {
    console.error('❌ Error generating quotation ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quotation ID',
      details: error.message
    });
  } finally {
    await session.endSession();
  }
});

// Check latest quotation ID for a specific user and date to prevent duplicates (legacy endpoint)
router.post('/check-latest-quotation-id', async (req, res) => {
  try {

    const { firstName, year, month, day } = req.body;

    if (!firstName || !year || !month || !day) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, year, month, day'
      });
    }

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

    } else {

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

// Assign client/quotations to sales person
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { clientId, salesUserId } = req.body;

    if (!clientId || !salesUserId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and Sales User ID are required'
      });
    }

    // Validate Sales User
    const salesUser = await SalesUser.findById(salesUserId);
    if (!salesUser) {
      return res.status(404).json({
        success: false,
        message: 'Sales User not found'
      });
    }

    // Update all unassigned quotations for this client
    const result = await Quotation.updateMany(
      { clientId: clientId, salesUserId: null },
      {
        $set: {
          salesUserId: salesUser._id,
          salesUserName: salesUser.name
        }
      }
    );

    res.json({
      success: true,
      message: `Successfully assigned ${result.modifiedCount} quotations to ${salesUser.name}`,
      result
    });

  } catch (error) {
    console.error('Error assigning leads:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning leads',
      error: error.message
    });
  }
});

export default router;

