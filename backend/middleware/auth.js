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
    if (decoded.name && decoded.email && decoded.location && decoded.contactNumber) {
      req.user = {
        _id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        location: decoded.location,
        contactNumber: decoded.contactNumber,
        role: decoded.role || 'sales', // Default to sales for backward compatibility
        mustChangePassword: false // Default to false for cached data
      };
      return next();
    }
    
    // Fallback: Verify user still exists (only if token doesn't contain user data)
    const user = await SalesUser.findById(decoded.id)
      .select('email name location contactNumber mustChangePassword role')
      .lean();
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = user;
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
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      name: user.name,
      location: user.location,
      contactNumber: user.contactNumber,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '30d' } // Match the login route expiry
  );
};

