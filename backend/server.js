import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import connectDB from './config/database.js';
import salesRoutes from './routes/sales.js';
import { runPartnerCreation } from './scripts/runPartnerCreation.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// Run partner creation script if enabled (non-blocking)
if (process.env.RUN_PARTNER_SCRIPT === 'true') {
  console.log('🔧 RUN_PARTNER_SCRIPT=true detected');
  console.log('📝 Running partner creation script...');
  
  // Run asynchronously without blocking server startup
  runPartnerCreation()
    .then(() => {
      console.log('✅ Partner script completed successfully');
    })
    .catch((error) => {
      console.error('❌ Partner script failed:', error.message);
      // Don't exit - server should continue running
    });
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Sales API: http://localhost:${PORT}/api/sales`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Quotation Assignment Fix: DEPLOYED (commit f2b06cc)`);
  console.log(`📝 Backend code includes:`);
  console.log(`   - ObjectId validation for salesUserId`);
  console.log(`   - Assignment verification after save`);
  console.log(`   - Enhanced logging for debugging`);
});

export default app;


