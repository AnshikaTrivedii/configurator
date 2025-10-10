const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixKhushiLogin() {
  try {
    console.log('🔧 Fixing Khushi login account...');
    
    // Connect to the same database the server is using
    await mongoose.connect('mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to cloud database');
    
    const { default: SalesUser } = await import('./models/SalesUser.js');
    
    // Find Khushi's account
    const khushiUser = await SalesUser.findOne({ email: 'khushi.jafri@orion-led.com' });
    
    if (khushiUser) {
      console.log('👤 Found Khushi user:', khushiUser.name);
      console.log('🔧 Resetting password...');
      
      // Reset password to default
      const passwordHash = bcrypt.hashSync('Orion@123', 12);
      khushiUser.passwordHash = passwordHash;
      khushiUser.mustChangePassword = false;
      khushiUser.role = 'sales';
      await khushiUser.save();
      
      console.log('✅ Khushi password reset successfully');
      console.log('📧 Email: khushi.jafri@orion-led.com');
      console.log('🔑 Password: Orion@123');
      console.log('👤 Name:', khushiUser.name);
      console.log('🔑 Role: sales');
    } else {
      console.log('❌ Khushi user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixKhushiLogin().catch(console.error);
