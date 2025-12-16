import jwt from 'jsonwebtoken';
import SalesUser from '../models/SalesUser.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // If token contains user data, use it directly for better performance
    // CRITICAL: Verify decoded.id exists (it's the user's _id)
    if (decoded.name && decoded.email && decoded.location && decoded.contactNumber) {
      if (!decoded.id) {
        console.error('❌ CRITICAL: JWT token missing id field!', {
          decoded: decoded,
          decodedKeys: Object.keys(decoded || {}),
          note: 'Token should include id field from login'
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid token: Missing user ID'
        });
      }
      
      req.user = {
        _id: decoded.id, // CRITICAL: Include _id from token (used as string in responses)
        email: decoded.email,
        name: decoded.name,
        location: decoded.location,
        contactNumber: decoded.contactNumber,
        role: decoded.role || 'sales', // Default to sales for backward compatibility
        allowedCustomerTypes: decoded.allowedCustomerTypes || [], // Include permissions
        mustChangePassword: false // Default to false for cached data
      };
      
      console.log('🔐 Auth middleware - Using token data:', {
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role
      });
      
      return next();
    }
    
    // Fallback: Verify user still exists (only if token doesn't contain user data)
    // CRITICAL: Include _id in select (it's included by default, but explicit for clarity)
    if (!decoded.id) {
      console.error('❌ CRITICAL: JWT token missing id field in fallback path!', {
        decoded: decoded,
        decodedKeys: Object.keys(decoded || {})
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token: Missing user ID'
      });
    }
    
    const user = await SalesUser.findById(decoded.id)
      .select('_id email name location contactNumber mustChangePassword role allowedCustomerTypes')
      .lean();
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (!user._id) {
      console.error('❌ CRITICAL: Database user missing _id!', {
        userEmail: user.email,
        userKeys: Object.keys(user || {})
      });
      return res.status(500).json({
        success: false,
        message: 'Internal server error: User ID missing'
      });
    }

    req.user = user;
    
    console.log('🔐 Auth middleware - Using database user:', {
      userId: req.user._id?.toString(),
      userEmail: req.user.email,
      userRole: req.user.role
    });
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

export const generateToken = (user) => {
  const allowedCustomerTypes = user.role === 'partner' ? (user.allowedCustomerTypes || []) : [];
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      name: user.name,
      location: user.location,
      contactNumber: user.contactNumber,
      role: user.role,
      allowedCustomerTypes: allowedCustomerTypes
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '30d' } // Match the login route expiry
  );
};

