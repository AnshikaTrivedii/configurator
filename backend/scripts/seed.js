import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import SalesUser from '../models/SalesUser.js';
import connectDB from '../config/database.js';

// Sales team data with correct phone numbers
const SALES_TEAM_DATA = [
  { email: 'ashoo.nitin@orion-led.com', name: 'Ashoo Nitin', phoneNumber: '8826888023', location: 'Delhi' },
  { email: 'mukund.puranik@orion-led.com', name: 'Mukund Puranik', phoneNumber: '9701797731', location: 'Hyderabad' },
  { email: 'onkar@orion-led.com', name: 'Onkar', phoneNumber: '9820318887', location: 'Mumbai' },
  { email: 'prachi.sharma@orion-led.com', name: 'Prachi Sharma', phoneNumber: '8826888050', location: 'Delhi' },
  { email: 'rajneesh.rawat@orion-led.com', name: 'Rajneesh Rawat', phoneNumber: '9839177000', location: 'Delhi' },
  { email: 'sales@orion-led.com', name: 'Sales Team', phoneNumber: '98391 77083', location: 'Delhi' },
  { email: 'vivekanand@orion-led.com', name: 'Vivekanand', phoneNumber: '9810163963', location: 'Delhi' },
  { email: 'khushi.jafri@orion-led.com', name: 'Khushi Jafri', phoneNumber: '8588882820', location: 'Lucknow' },
  { email: 'ashwani.yadav@orion-led.com', name: 'Ashwani Yadav', phoneNumber: '98391 77083', location: 'Lucknow' },
  { email: 'anshika.trivedi@orion-led.com', name: 'Anshika Trivedi', phoneNumber: '9140526027', location: 'Lucknow' },
  { email: 'madhur@orion-led.com', name: 'Madhur', phoneNumber: '98391 77046', location: 'Delhi' },
  { email: 'amisha@orion-led.com', name: 'Amisha', phoneNumber: '98391 77083', location: 'Lucknow' },
  { email: 'admin@orion-led.com', name: 'Admin', phoneNumber: '98391 77083', location: 'Delhi' }
];

const DEFAULT_PASSWORD = 'Orion@123';

const seedSalesUsers = async () => {
  try {
    console.log('Starting sales users seeding...');
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of SALES_TEAM_DATA) {
      try {
        // Check if user already exists
        const existingUser = await SalesUser.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`User ${userData.email} already exists, skipping...`);
          skippedCount++;
          continue;
        }

        // Create new user with default password
        const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);
        
        const newUser = new SalesUser({
          email: userData.email,
          name: userData.name,
          location: userData.location,
          contactNumber: userData.phoneNumber,
          passwordHash,
          mustChangePassword: true,
          passwordSetAt: null
        });

        await newUser.save();
        console.log(`Created user: ${userData.email}`);
        createdCount++;
        
      } catch (error) {
        console.error(`Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log(`\nSeeding completed:`);
    console.log(`- Created: ${createdCount} users`);
    console.log(`- Skipped: ${skippedCount} existing users`);
    console.log(`- Default password for new users: ${DEFAULT_PASSWORD}`);
    
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

const main = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Run seeding
    await seedSalesUsers();
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
    
  } catch (error) {
    console.error('Main seeding error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default seedSalesUsers;

