const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function resetProductionPassword() {
  try {
    // Connect to production MongoDB Atlas
    const MONGODB_URI = 'mongodb+srv://anshikatrivedi:anshika123@cluster0.8jqjq.mongodb.net/configurator?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to production MongoDB Atlas');
    
    // Get the database
    const db = mongoose.connection.db;
    const users = db.collection('salesusers');
    
    // Find the user
    const user = await users.findOne({ email: 'anshika.trivedi@orion-led.com' });
    if (user) {
      console.log('User found in production:', {
        email: user.email,
        name: user.name,
        mustChangePassword: user.mustChangePassword,
        hasPasswordHash: !!user.passwordHash
      });
      
      // Reset password to default
      const newHash = bcrypt.hashSync('Orion@123', 10);
      await users.updateOne(
        { email: 'anshika.trivedi@orion-led.com' },
        { 
          $set: { 
            passwordHash: newHash,
            mustChangePassword: true,
            passwordSetAt: null
          }
        }
      );
      console.log('✅ Password reset to Orion@123 in production database');
    } else {
      console.log('❌ User not found in production database');
      
      // Create the user if it doesn't exist
      const newHash = bcrypt.hashSync('Orion@123', 10);
      await users.insertOne({
        email: 'anshika.trivedi@orion-led.com',
        name: 'Anshika Trivedi',
        location: 'Lucknow',
        contactNumber: '9140526027',
        passwordHash: newHash,
        mustChangePassword: true,
        passwordSetAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ User created with password Orion@123');
    }
    
    // Close connection
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetProductionPassword();
