import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import salesRoutes from './routes/sales.js';
import productsRoutes from './routes/products.js';
import emailRoutes from './routes/email.js';
import { runPartnerCreation } from './scripts/runPartnerCreation.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// Run partner creation script if enabled (wait for database connection first)
if (process.env.RUN_PARTNER_SCRIPT === 'true') {
  console.log('🔧 RUN_PARTNER_SCRIPT=true detected');
  
  const runPartnerScript = async () => {
    console.log('📝 Running partner creation script...');
    try {
      await runPartnerCreation();
      console.log('✅ Partner script completed successfully');
    } catch (error) {
      console.error('❌ Partner script failed:', error.message);
      console.error('❌ Full error:', error);
      // Don't exit - server should continue running
    }
  };
  
  // Check if database is already connected
  if (mongoose.connection.readyState === 1) {
    // Already connected, run immediately
    runPartnerScript();
  } else {
    // Wait for database connection
    console.log('📝 Waiting for database connection before running partner creation script...');
    mongoose.connection.once('connected', () => {
      console.log('✅ Database connected');
      runPartnerScript();
    });
  }
} else {
  console.log('ℹ️  Partner creation script skipped (RUN_PARTNER_SCRIPT not set to "true")');
}

// Middleware
app.use(compression()); // Enable gzip compression for better performance
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:4173'    
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Configurator Backend API is running - UPDATED CODE VERSION',
    timestamp: new Date().toISOString(),
    version: 'v2.1.0',
    features: {
      quotationAssignment: 'DEPLOYED',
      objectIdValidation: 'ENABLED',
      assignmentVerification: 'ENABLED',
      enhancedLogging: 'ENABLED'
    },
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  });
});

// API Routes
app.use('/api/sales', salesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/email', emailRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Start server
// Listen on 0.0.0.0 to accept connections from other Docker containers
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔐 Sales API: http://0.0.0.0:${PORT}/api/sales`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Quotation Assignment Fix: DEPLOYED (commit f2b06cc)`);
  console.log(`📝 Backend code includes:`);
  console.log(`   - ObjectId validation for salesUserId`);
  console.log(`   - Assignment verification after save`);
  console.log(`   - Enhanced logging for debugging`);
});

export default app;


