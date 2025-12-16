import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import SalesUser from '../models/SalesUser.js';
import connectDB from '../config/database.js';

const DEFAULT_PASSWORD = 'Orion@123';

// Partner users data
const PARTNER_USERS = [
  {
    email: 'anushka48@gmail.com',
    name: 'Anushka',
    location: 'Default',
    contactNumber: '0000000000',
    role: 'partner',
    allowedCustomerTypes: ['endUser']
  },
  {
    email: 'amanabcd@gmail.com',
    name: 'Aman',
    location: 'Default',
    contactNumber: '0000000000',
    role: 'partner',
    allowedCustomerTypes: ['reseller']
  }
];

const createPartnerUsers = async () => {
  try {
    console.log('🚀 Starting partner users creation...');
    console.log(`📝 Default password: ${DEFAULT_PASSWORD}`);
    console.log(`📝 Password must be changed on first login: true\n`);
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const userData of PARTNER_USERS) {
      try {
        // Check if user already exists
        const existingUser = await SalesUser.findOne({ email: userData.email });
        
        if (existingUser) {
          // Update existing user
          const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);
          existingUser.name = userData.name;
          existingUser.location = userData.location;
          existingUser.contactNumber = userData.contactNumber;
          existingUser.passwordHash = passwordHash;
          existingUser.mustChangePassword = true;
          existingUser.passwordSetAt = null;
          existingUser.role = userData.role;
          existingUser.allowedCustomerTypes = userData.allowedCustomerTypes;
          
          await existingUser.save();
          console.log(`✅ Updated partner user: ${userData.email}`);
          console.log(`   Name: ${userData.name}`);
          console.log(`   Role: ${userData.role}`);
          console.log(`   Allowed Customer Types: ${userData.allowedCustomerTypes.join(', ')}`);
          console.log(`   Password: ${DEFAULT_PASSWORD} (must change on first login)\n`);
          updatedCount++;
          continue;
        }

        // Create new partner user
        const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);
        
        const newUser = new SalesUser({
          email: userData.email,
          name: userData.name,
          location: userData.location,
          contactNumber: userData.contactNumber,
          passwordHash,
          mustChangePassword: true,
          passwordSetAt: null,
          role: userData.role,
          allowedCustomerTypes: userData.allowedCustomerTypes
        });

        await newUser.save();
        console.log(`✅ Created partner user: ${userData.email}`);
        console.log(`   Name: ${userData.name}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   Allowed Customer Types: ${userData.allowedCustomerTypes.join(', ')}`);
        console.log(`   Password: ${DEFAULT_PASSWORD} (must change on first login)\n`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating/updating partner user ${userData.email}:`, error.message);
        if (error.code === 11000) {
          console.error(`   User with email ${userData.email} already exists (duplicate key error)`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${createdCount} partner users`);
    console.log(`   🔄 Updated: ${updatedCount} partner users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} partner users`);
    console.log(`\n🔐 Default password for all partners: ${DEFAULT_PASSWORD}`);
    console.log(`⚠️  Partners must change password on first login\n`);
    
  } catch (error) {
    console.error('❌ Partner creation error:', error);
    throw error;
  }
};

const main = async () => {
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');
    
    // Create partner users
    await createPartnerUsers();
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
main();

