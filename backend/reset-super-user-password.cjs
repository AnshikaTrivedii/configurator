const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function resetSuperUserPassword() {
  try {
    // Connect to the same database as the backend
    const MONGODB_URI = 'mongodb://localhost:27017/configurator';
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database');
    
    // Get the database
    const db = mongoose.connection.db;
    const users = db.collection('salesusers');
    
    // Find the super user
    const user = await users.findOne({ email: 'super@orion-led.com' });
    if (user) {
      console.log('Super user found:', {
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        hasPasswordHash: !!user.passwordHash
      });
      
      // Reset password to default
      const newHash = bcrypt.hashSync('Orion@123', 10);
      await users.updateOne(
        { email: 'super@orion-led.com' },
        { 
          $set: { 
            passwordHash: newHash,
            mustChangePassword: true,
            passwordSetAt: null
          }
        }
      );
      console.log('✅ Super user password reset to Orion@123');
    } else {
      console.log('❌ Super user not found');
    }
    
    // Close connection
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetSuperUserPassword();
