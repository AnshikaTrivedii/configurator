const mongoose = require('mongoose');

async function checkSalesUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/configurator');
    console.log('✅ Connected to MongoDB');
    
    const { default: SalesUser } = await import('./models/SalesUser.js');
    
    const users = await SalesUser.find({});
    console.log('👥 Sales users in database:');
    users.forEach(user => {
      console.log(`- Email: ${user.email}, Name: ${user.name}, Type: ${user.userType}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No sales users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSalesUsers().catch(console.error);
