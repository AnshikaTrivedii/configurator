const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Try the connection string that matches the logs
const MONGODB_URI = 'mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0';

async function checkBackendDatabase() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Get the database
    const db = mongoose.connection.db;
    console.log('Database name:', db.databaseName);
    console.log('Connection host:', mongoose.connection.host);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check salesusers collection
    const users = db.collection('salesusers');
    const userCount = await users.countDocuments();
    console.log('Total users in salesusers collection:', userCount);
    
    // List all users
    const allUsers = await users.find({}).toArray();
    console.log('All users:', allUsers.map(u => ({ email: u.email, name: u.name })));
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBackendDatabase();
