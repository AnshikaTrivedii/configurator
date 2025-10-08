import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SalesUser from '../models/SalesUser.js';
import Quotation from '../models/Quotation.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { validateLogin, validateSetPassword, validateChangePassword } from '../middleware/validation.js';

// Function to calculate correct price using PDF pricing logic
function calculateCorrectPrice(quotation) {
  try {
    const productDetails = quotation.productDetails;
    const userType = quotation.userType || 'endUser';
    
    if (!productDetails) {
      console.warn('No product details found for quotation:', quotation.quotationId);
      return quotation.totalPrice || 0;
    }

    // Convert userType to match PDF logic
    let pdfUserType = 'End User';
    if (userType === 'reseller') {
      pdfUserType = 'Reseller';
    } else if (userType === 'siChannel') {
      pdfUserType = 'Channel';
    }

    // Get unit price using PDF logic
    const unitPrice = getProductPriceForPdf(productDetails, pdfUserType);
    
    // Calculate quantity based on product type (same logic as PDF)
    let quantity;
    if (productDetails.category?.toLowerCase().includes('rental')) {
      // For rental series, calculate quantity as number of cabinets
      quantity = productDetails.cabinetGrid ? 
        (productDetails.cabinetGrid.columns * productDetails.cabinetGrid.rows) : 1;
    } else {
      // For other products, calculate quantity in square feet
      const METERS_TO_FEET = 3.2808399;
      const displaySize = productDetails.displaySize;
      if (displaySize && displaySize.width && displaySize.height) {
        // Use display size in meters, convert to feet, then to square feet
        const widthInFeet = displaySize.width * METERS_TO_FEET;
        const heightInFeet = displaySize.height * METERS_TO_FEET;
        quantity = widthInFeet * heightInFeet;
      } else {
        // Fallback calculation
        quantity = 1;
      }
    }

    // Calculate total price
    const subtotal = unitPrice * quantity;
    
    // Add processor price if available
    let processorPrice = 0;
    if (productDetails.processor) {
      processorPrice = getProcessorPrice(productDetails.processor, pdfUserType);
    }

    const grandTotal = subtotal + processorPrice;
    
    console.log(`Price calculation for ${quotation.quotationId}:`, {
      unitPrice,
      quantity,
      subtotal,
      processorPrice,
      grandTotal,
      userType: pdfUserType
    });

    return Math.round(grandTotal);
    
  } catch (error) {
    console.error('Error calculating correct price for quotation:', quotation.quotationId, error);
    return quotation.totalPrice || 0; // Fallback to stored price
  }
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
    const userData = user.toJSON();

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
    const userData = user.toJSON();

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

// POST /api/sales/quotation (save quotation to database)
router.post('/quotation', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Received quotation save request');
    console.log('👤 Sales User:', req.user.name, req.user.email);
    console.log('📋 Request body keys:', Object.keys(req.body));
    
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
      totalPrice
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

    // Create new quotation
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
      totalPrice: totalPrice || 0
    });

    await quotation.save();
    
    console.log('✅ Quotation saved successfully:', quotation.quotationId);
    console.log('📊 Product details keys:', Object.keys(quotation.productDetails || {}));

    res.json({
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
    });

  } catch (error) {
    console.error('❌ Save quotation error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue
    });
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID already exists'
      });
    }
    
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

        // Also get revenue for all quotations
        const revenueResult = await Quotation.aggregate([
          {
            $match: {
              salesUserId: user._id,
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
    
    // Add additional statistics (for all quotations)
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
      
      // Use the stored price directly (it's already correct and matches PDF)
      customerMap.get(customerKey).quotations.push({
        quotationId: quotation.quotationId,
        productName: quotation.productName,
        productDetails: quotation.productDetails,
        totalPrice: quotation.totalPrice, // Use stored price (already correct)
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

export default router;

