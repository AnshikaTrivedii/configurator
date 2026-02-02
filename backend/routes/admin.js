import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import QuoteQuery from '../models/QuoteQuery.js';
import SalesUser from '../models/SalesUser.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Middleware to check if user is super admin
 */
const requireSuperAdmin = (req, res, next) => {
  const isSuperAdmin = ['super', 'super_admin', 'superadmin', 'admin'].includes(req.user?.role);
  
  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin role required.'
    });
  }
  
  next();
};

/**
 * GET /api/admin/quotes
 * 
 * List all quote queries (admin only)
 * Query params:
 * - page: page number (default: 1)
 * - limit: items per page (default: 50)
 * - search: search by customer name, email, or product name
 * - status: filter by status (new, contacted, closed)
 */
router.get('/quotes', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    // Build query
    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }

    // Fetch quotes with pagination and populate assigned sales user
    const quotes = await QuoteQuery.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await QuoteQuery.countDocuments(query);

    return res.json({
      success: true,
      data: {
        quotes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching quote queries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quote queries'
    });
  }
});

/**
 * GET /api/admin/quotes/:quoteId
 * 
 * Get single quote query details (admin only)
 */
router.get('/quotes/:quoteId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quote = await QuoteQuery.findOne({ quoteId })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .lean();

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote query not found'
      });
    }

    return res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Error fetching quote query:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quote query'
    });
  }
});

/**
 * POST /api/admin/quotes/:quoteId/assign
 * 
 * Assign quote query to a sales user (admin only)
 */
router.post('/quotes/:quoteId/assign', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { salesUserId } = req.body;

    // Validate salesUserId
    if (!salesUserId) {
      return res.status(400).json({
        success: false,
        message: 'Sales user ID is required'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(salesUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sales user ID format'
      });
    }

    // Check if sales user exists and is active
    const salesUser = await SalesUser.findById(salesUserId);
    if (!salesUser) {
      return res.status(404).json({
        success: false,
        message: 'Sales user not found'
      });
    }

    // Check if quote exists
    const quote = await QuoteQuery.findOne({ quoteId });
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote query not found'
      });
    }

    // Update assignment
    quote.assignedTo = salesUserId;
    quote.assignedBy = req.user._id;
    quote.assignedAt = new Date();
    
    await quote.save();

    // Populate and return updated quote
    const updatedQuote = await QuoteQuery.findById(quote._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .lean();

    return res.json({
      success: true,
      message: 'Quote assigned successfully',
      data: updatedQuote
    });
  } catch (error) {
    console.error('Error assigning quote:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign quote'
    });
  }
});

export default router;

