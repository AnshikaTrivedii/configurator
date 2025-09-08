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

async function createUserProperly() {
  try {
    console.log('Connecting to production database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Delete existing user first
    await SalesUser.deleteOne({ email: 'anshika.trivedi@orion-led.com' });
    console.log('✅ Deleted existing user');
    
    // Create user using Mongoose model
    const user = new SalesUser({
      email: 'anshika.trivedi@orion-led.com',
      name: 'Anshika Trivedi',
      location: 'Lucknow',
      contactNumber: '9140526027',
      passwordHash: bcrypt.hashSync('Orion@123', 12),
      mustChangePassword: true,
      passwordSetAt: null
    });
    
    await user.save();
    console.log('✅ User created successfully using Mongoose model');
    
    // Test the user
    const foundUser = await SalesUser.findOne({ email: 'anshika.trivedi@orion-led.com' });
    if (foundUser) {
      console.log('✅ User found:', {
        email: foundUser.email,
        name: foundUser.name,
        mustChangePassword: foundUser.mustChangePassword
      });
      
      // Test password
      const isPasswordValid = foundUser.checkPassword('Orion@123');
      console.log('✅ Password verification:', isPasswordValid);
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUserProperly();
