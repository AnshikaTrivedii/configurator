const mongoose = require('mongoose');

async function checkSalesUsersLogin() {
  try {
    console.log('🔍 Checking sales users for login...');
    
    // Connect to the same database the server is using
    await mongoose.connect('mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to cloud database');
    
    const { default: SalesUser } = await import('./models/SalesUser.js');
    
    // Get all sales users
    const users = await SalesUser.find({}).select('email name role mustChangePassword');
    
    console.log('👥 Available Sales Users:');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. 👤 User Details:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Name: ${user.name}`);
      console.log(`   🔑 Role: ${user.role || 'sales'}`);
      console.log(`   🔐 Must Change Password: ${user.mustChangePassword}`);
      console.log(`   💡 Default Password: Orion@123`);
    });
    
    console.log('\n🔐 LOGIN INSTRUCTIONS:');
    console.log('1. Use any of the email addresses above');
    console.log('2. Default password for all users: Orion@123');
    console.log('3. If login fails, the user might need to set their password first');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSalesUsersLogin().catch(console.error);
