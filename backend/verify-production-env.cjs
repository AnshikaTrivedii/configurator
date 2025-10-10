const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// This script helps verify that production environment variables are set correctly
// Run this script in your production environment to check configuration

async function verifyProductionEnvironment() {
  console.log('🔧 Production Environment Verification');
  console.log('=====================================');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`  - MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`);
  console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || '❌ Not set'}`);
  console.log(`  - PORT: ${process.env.PORT || '❌ Not set'}`);
  console.log(`  - FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅ Set' : '❌ Not set'}`);
  
  // Check if we're in production mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n⚠️  Warning: NODE_ENV is not set to "production"');
  }
  
  // Test database connection
  if (process.env.MONGODB_URI) {
    try {
      console.log('\n🔗 Testing database connection...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Database connection successful');
      
      // Test Super Admin user
      const SalesUser = mongoose.model('SalesUser', new mongoose.Schema({
        email: String,
        name: String,
        location: String,
        contactNumber: String,
        passwordHash: String,
        mustChangePassword: Boolean,
        passwordSetAt: Date,
        role: String
      }, { timestamps: true }));
      
      const superUser = await SalesUser.findOne({ email: 'super@orion-led.com' });
      if (superUser) {
        console.log('✅ Super Admin user found in database');
        console.log(`  - Email: ${superUser.email}`);
        console.log(`  - Role: ${superUser.role}`);
        
        // Test password verification
        const isPasswordValid = bcrypt.compareSync('Orion@123', superUser.passwordHash);
        console.log(`  - Password verification: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
      } else {
        console.log('❌ Super Admin user not found in database');
      }
      
      await mongoose.disconnect();
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
    }
  } else {
    console.log('\n❌ Cannot test database - MONGODB_URI not set');
  }
  
  // Test JWT functionality
  if (process.env.JWT_SECRET) {
    try {
      console.log('\n🔐 Testing JWT functionality...');
      const testPayload = { id: 'test', email: 'test@example.com', role: 'super' };
      const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT token generation and verification successful');
    } catch (error) {
      console.log('❌ JWT functionality failed:', error.message);
    }
  } else {
    console.log('\n❌ Cannot test JWT - JWT_SECRET not set');
  }
  
  console.log('\n🎯 Summary:');
  console.log('===========');
  
  const hasRequiredVars = process.env.MONGODB_URI && process.env.JWT_SECRET;
  if (hasRequiredVars) {
    console.log('✅ All required environment variables are set');
    console.log('✅ Production environment appears to be configured correctly');
    console.log('\n📝 Next steps:');
    console.log('1. Test Super Admin login with: super@orion-led.com / Orion@123');
    console.log('2. Check Railway logs if login still fails');
    console.log('3. Verify frontend is pointing to correct API URL');
  } else {
    console.log('❌ Missing required environment variables');
    console.log('❌ Please set MONGODB_URI and JWT_SECRET in Railway');
    console.log('\n📝 Required environment variables:');
    console.log('- MONGODB_URI: Your MongoDB connection string');
    console.log('- JWT_SECRET: A secure secret for JWT token signing');
    console.log('- NODE_ENV: Set to "production"');
    console.log('- FRONTEND_URL: Your frontend domain');
  }
}

verifyProductionEnvironment().catch(console.error);
