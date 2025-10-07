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
    
    // Create/update the super user
    const userData = {
      email: 'super@orion-led.com',
      name: 'Super User',
      location: 'Delhi',
      contactNumber: '98391 77083',
      passwordHash: bcrypt.hashSync('Orion@123', 10),
      mustChangePassword: true,
      passwordSetAt: null,
      role: 'super',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Upsert the super user
    const result = await users.updateOne(
      { email: 'super@orion-led.com' },
      { $set: userData },
      { upsert: true }
    );
    
    if (result.upsertedCount > 0) {
      console.log('✅ Super user created successfully');
    } else {
      console.log('✅ Super user updated successfully');
    }
    
    console.log('\n🔑 Super User Login Credentials:');
    console.log('Email: super@orion-led.com');
    console.log('Password: Orion@123');
    console.log('Role: super');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateProductionDatabase();
