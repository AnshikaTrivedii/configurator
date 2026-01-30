import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import SalesUser from '../models/SalesUser.js';
import connectDB from '../config/database.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Sales team data with correct phone numbers
const SALES_TEAM_DATA = [
  { email: 'ashoo.nitin@orion-led.com', name: 'Ashoo Nitin', phoneNumber: '8826888023', location: 'Delhi' },
  { email: 'mukund.puranik@orion-led.com', name: 'Mukund Puranik', phoneNumber: '9701797731', location: 'Hyderabad' },
  { email: 'onkar@orion-led.com', name: 'Onkar', phoneNumber: '9820318887', location: 'Mumbai' },
  { email: 'prachi.sharma@orion-led.com', name: 'Prachi Sharma', phoneNumber: '8826888050', location: 'Delhi' },
  { email: 'rajneesh.rawat@orion-led.com', name: 'Rajneesh Rawat', phoneNumber: '9839177000', location: 'Delhi' },
  { email: 'vivekanand@orion-led.com', name: 'Vivekanand', phoneNumber: '9810163963', location: 'Delhi' },
  { email: 'khushi.jafri@orion-led.com', name: 'Khushi Jafri', phoneNumber: '8588882820', location: 'Lucknow' },
  { email: 'ashwani.yadav@orion-led.com', name: 'Ashwani Yadav', phoneNumber: '98391 77083', location: 'Lucknow' },
  { email: 'anshika.trivedi@orion-led.com', name: 'Anshika Trivedi', phoneNumber: '9140526027', location: 'Lucknow' },
  { email: 'madhur@orion-led.com', name: 'Madhur', phoneNumber: '98391 77046', location: 'Delhi' },
  { email: 'amisha@orion-led.com', name: 'Amisha', phoneNumber: '98391 77083', location: 'Lucknow' },
];

const DEFAULT_PASSWORD = 'Orion@123';

const seedSalesUsers = async () => {
  try {

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of SALES_TEAM_DATA) {
      try {
        // Check if user already exists
        const existingUser = await SalesUser.findOne({ email: userData.email });

        if (existingUser) {
          // Update existing user if role is missing or incorrect
          let updated = false;
          if (!existingUser.role || existingUser.role !== 'sales') {
            existingUser.role = 'sales';
            await existingUser.save();

            updated = true;
          }

          if (!updated) {

          }
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
          passwordSetAt: null,
          role: 'sales' // Explicitly set role to 'sales' for all sales users
        });

        await newUser.save();

        createdCount++;

      } catch (error) {
        console.error(`Error creating/updating user ${userData.email}:`, error.message);
      }
    }

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

    process.exit(0);

  } catch (error) {
    console.error('Main seeding error:', error);
    process.exit(1);
  }
};

// Run if called directly (Windows-safe)
// `import.meta.url` is a file URL; `process.argv[1]` is a filesystem path.
// Comparing them as strings breaks on Windows, so compare normalized paths.
const isDirectRun =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main();
}

export default seedSalesUsers;

