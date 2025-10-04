import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SalesUser from '../models/SalesUser.js';
import Quotation from '../models/Quotation.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { validateLogin, validateSetPassword, validateChangePassword } from '../middleware/validation.js';

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

    // Get quotation counts for each user (only 'Converted' and 'In Progress' statuses)
    const usersWithQuotationCounts = await Promise.all(
      salesUsers.map(async (user) => {
        const quotationCount = await Quotation.countDocuments({
          salesUserId: user._id,
          status: { $in: ['Converted', 'In Progress', 'pending'] }, // Include 'pending' status for backward compatibility
          ...dateFilter
        });

        // Also get revenue for valid quotations only
        const revenueResult = await Quotation.aggregate([
          {
            $match: {
              salesUserId: user._id,
              status: { $in: ['Converted', 'In Progress', 'pending'] },
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

    // Calculate top performers (users with the highest number of 'Converted' or 'In Progress' quotations)
    const validPerformers = usersWithQuotationCounts.filter(user => user.quotationCount > 0);
    const maxQuotationCount = validPerformers.length > 0 ? validPerformers[0].quotationCount : 0;
    const topPerformers = validPerformers.filter(user => user.quotationCount === maxQuotationCount);
    
    // Add additional statistics (only for 'Converted' and 'In Progress' quotations)
    const totalRevenue = await Quotation.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Converted', 'In Progress', 'pending'] }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    const quotationsByMonth = await Quotation.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Converted', 'In Progress', 'pending'] }
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
      
      customerMap.get(customerKey).quotations.push({
        quotationId: quotation.quotationId,
        productName: quotation.productName,
        productDetails: quotation.productDetails,
        totalPrice: quotation.totalPrice,
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

