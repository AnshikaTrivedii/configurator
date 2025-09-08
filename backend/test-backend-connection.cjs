const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use the connection string from the logs
const MONGODB_URI = 'mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0';

// Define the schema exactly like the backend
const salesUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  mustChangePassword: {
    type: Boolean,
    default: true
  },
  passwordSetAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Add the checkPassword method
salesUserSchema.methods.checkPassword = function(password) {
  if (!this.passwordHash || !password) {
    return false;
  }
  return bcrypt.compareSync(password, this.passwordHash);
};

const SalesUser = mongoose.model('SalesUser', salesUserSchema);

async function testBackendConnection() {
  try {
    console.log('Connecting to production database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Create a test user
    const testUser = new SalesUser({
      email: 'test@test.com',
      name: 'Test User',
      location: 'Test Location',
      contactNumber: '1234567890',
      passwordHash: bcrypt.hashSync('test123', 12),
      mustChangePassword: true,
      passwordSetAt: null
    });
    
    await testUser.save();
    console.log('✅ Test user created');
    
    // Try to find it
    const foundUser = await SalesUser.findOne({ email: 'test@test.com' });
    if (foundUser) {
      console.log('✅ Test user found:', foundUser.email);
      
      // Test password
      const isPasswordValid = foundUser.checkPassword('test123');
      console.log('✅ Test password verification:', isPasswordValid);
    } else {
      console.log('❌ Test user not found');
    }
    
    // Clean up
    await SalesUser.deleteOne({ email: 'test@test.com' });
    console.log('✅ Test user cleaned up');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testBackendConnection();
