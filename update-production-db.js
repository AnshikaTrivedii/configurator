const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Replace this with your actual MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://anshikatrivedi:anshika123@cluster0.8jqjq.mongodb.net/configurator?retryWrites=true&w=majority';

async function updateProductionDatabase() {
  try {
    console.log('Connecting to production database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Get the database
    const db = mongoose.connection.db;
    const users = db.collection('salesusers');
    
    // Create/update the user
    const userData = {
      email: 'anshika.trivedi@orion-led.com',
      name: 'Anshika Trivedi',
      location: 'Lucknow',
      contactNumber: '9140526027',
      passwordHash: bcrypt.hashSync('Orion@123', 10),
      mustChangePassword: true,
      passwordSetAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Upsert the user
    const result = await users.updateOne(
      { email: 'anshika.trivedi@orion-led.com' },
      { $set: userData },
      { upsert: true }
    );
    
    if (result.upsertedCount > 0) {
      console.log('✅ User created successfully');
    } else {
      console.log('✅ User updated successfully');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateProductionDatabase();
