const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// This script ensures the Super Admin user exists in production with correct credentials
// Run this script to fix any Super Admin user issues

async function fixProductionSuperUser() {
  try {
    console.log('🔧 Fixing Production Super Admin User');
    console.log('====================================');
    
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI environment variable not set');
      console.log('Please set MONGODB_URI in your environment');
      return;
    }
    
    console.log('🔗 Connecting to production database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Define the schema exactly like the backend
    const salesUserSchema = new mongoose.Schema({
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      location: {
        type: String,
        required: true,
        trim: true
      },
      contactNumber: {
        type: String,
        required: true,
        trim: true
      },
      passwordHash: {
        type: String,
        required: true
      },
      mustChangePassword: {
        type: Boolean,
        default: true
      },
      passwordSetAt: {
        type: Date,
        default: null
      },
      role: {
        type: String,
        enum: ['sales', 'super'],
        default: 'sales'
      }
    }, {
      timestamps: true
    });
    
    const SalesUser = mongoose.model('SalesUser', salesUserSchema);
    
    const superUserEmail = 'super@orion-led.com';
    const superUserName = 'Super User';
    const superUserLocation = 'Delhi';
    const superUserPhone = '98391 77083';
    const defaultPassword = 'Orion@123';
    
    // Check if super user already exists
    let existingUser = await SalesUser.findOne({ email: superUserEmail });
    
    if (existingUser) {
      console.log(`✅ Super user ${superUserEmail} already exists`);
      console.log('🔧 Updating user with correct credentials...');
      
      // Update the user with correct password and role
      existingUser.role = 'super';
      existingUser.passwordHash = bcrypt.hashSync(defaultPassword, 10);
      existingUser.mustChangePassword = true;
      existingUser.passwordSetAt = null;
      existingUser.name = superUserName;
      existingUser.location = superUserLocation;
      existingUser.contactNumber = superUserPhone;
      
      await existingUser.save();
      console.log('✅ Super user updated successfully');
    } else {
      console.log('🔧 Creating new super user...');
      
      // Create password hash
      const passwordHash = bcrypt.hashSync(defaultPassword, 10);
      
      // Create new super user
      const superUser = new SalesUser({
        email: superUserEmail,
        name: superUserName,
        location: superUserLocation,
        contactNumber: superUserPhone,
        passwordHash,
        mustChangePassword: true,
        passwordSetAt: null,
        role: 'super'
      });
      
      await superUser.save();
      console.log('✅ Super user created successfully');
    }
    
    // Verify the user was created/updated correctly
    const verifiedUser = await SalesUser.findOne({ email: superUserEmail });
    if (verifiedUser) {
      console.log('\n🎉 Super User Verification:');
      console.log('===========================');
      console.log(`✅ Email: ${verifiedUser.email}`);
      console.log(`✅ Name: ${verifiedUser.name}`);
      console.log(`✅ Role: ${verifiedUser.role}`);
      console.log(`✅ Location: ${verifiedUser.location}`);
      console.log(`✅ Contact: ${verifiedUser.contactNumber}`);
      console.log(`✅ Must change password: ${verifiedUser.mustChangePassword}`);
      
      // Test password verification
      const isPasswordValid = bcrypt.compareSync(defaultPassword, verifiedUser.passwordHash);
      console.log(`✅ Password verification: ${isPasswordValid ? 'Valid' : 'Invalid'}`);
      
      console.log('\n🔑 Login Credentials:');
      console.log('====================');
      console.log(`Email: ${superUserEmail}`);
      console.log(`Password: ${defaultPassword}`);
      console.log(`Role: super`);
      
      console.log('\n✅ Super Admin user is ready for login!');
    } else {
      console.log('❌ Failed to verify super user creation');
    }
    
  } catch (error) {
    console.error('❌ Error fixing production super user:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

fixProductionSuperUser();
