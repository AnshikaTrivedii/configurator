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

        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating/updating partner user ${userData.email}:`, error.message);
        if (error.code === 11000) {
          console.error(`   User with email ${userData.email} already exists (duplicate key error)`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Partner creation error:', error);
    throw error;
  }
};

const main = async () => {
  try {
    // Connect to database

    await connectDB();

    // Create partner users
    await createPartnerUsers();
    
    // Close connection
    await mongoose.connection.close();

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
main();

