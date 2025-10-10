const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixSuperUser() {
  try {
    console.log('🔧 Fixing super user account...');
    
    // Connect to the same database the server is using
    await mongoose.connect('mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to cloud database');
    
    const { default: SalesUser } = await import('./models/SalesUser.js');
    
    // Find the super user
    const superUser = await SalesUser.findOne({ email: 'super@orion-led.com' });
    
    if (superUser) {
      console.log('👤 Found super user:', superUser.name);
      console.log('🔧 Resetting password...');
      
      // Reset password to default
      const passwordHash = bcrypt.hashSync('Orion@123', 12);
      superUser.passwordHash = passwordHash;
      superUser.mustChangePassword = false;
      superUser.role = 'super';
      await superUser.save();
      
      console.log('✅ Super user password reset successfully');
      console.log('📧 Email: super@orion-led.com');
      console.log('🔑 Password: Orion@123');
      console.log('👑 Role: super');
    } else {
      console.log('❌ Super user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixSuperUser().catch(console.error);
