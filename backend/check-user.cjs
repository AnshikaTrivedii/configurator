const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use the connection string from the logs
const MONGODB_URI = 'mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0';

async function checkUser() {
  try {
    console.log('Connecting to production database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Get the database
    const db = mongoose.connection.db;
    const users = db.collection('salesusers');
    
    // Find the user
    const user = await users.findOne({ email: 'anshika.trivedi@orion-led.com' });
    if (user) {
      console.log('✅ User found:', {
        email: user.email,
        name: user.name,
        hasPasswordHash: !!user.passwordHash,
        mustChangePassword: user.mustChangePassword,
        passwordSetAt: user.passwordSetAt
      });
      
      // Test password verification
      const testPassword = 'Orion@123';
      const isPasswordValid = bcrypt.compareSync(testPassword, user.passwordHash);
      console.log('Password verification test:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('❌ Password verification failed. Updating password...');
        const newHash = bcrypt.hashSync(testPassword, 10);
        await users.updateOne(
          { email: 'anshika.trivedi@orion-led.com' },
          { $set: { passwordHash: newHash } }
        );
        console.log('✅ Password updated');
      }
      
    } else {
      console.log('❌ User not found');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
