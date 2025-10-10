const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Production MongoDB connection
const MONGODB_URI = 'mongodb+srv://anshikatrivedi:anshika123@cluster0.8jqjq.mongodb.net/configurator?retryWrites=true&w=majority';

async function createSuperUser() {
  try {
    console.log('🔗 Connecting to production database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!');
    
    const db = mongoose.connection.db;
    const users = db.collection('salesusers');
    
    // Create super user data
    const superUserData = {
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
    
    // Upsert the user
    const result = await users.updateOne(
      { email: 'super@orion-led.com' },
      { $set: superUserData },
      { upsert: true }
    );
    
    if (result.upsertedCount > 0) {
      console.log('🎉 Super user created successfully!');
    } else {
      console.log('✅ Super user updated successfully!');
    }
    
    console.log('\n🔑 Login Credentials:');
    console.log('Email: super@orion-led.com');
    console.log('Password: Orion@123');
    console.log('Role: super');
    console.log('\n✅ You can now login!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

createSuperUser();

