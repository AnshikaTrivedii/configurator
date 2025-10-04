const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use the same local connection as the backend
const MONGODB_URI = 'mongodb://localhost:27017/configurator';

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
  },
  role: {
    type: String,
    enum: ['sales', 'super'],
    default: 'sales'
  }
}, {
  timestamps: true
});

const SalesUser = mongoose.model('SalesUser', salesUserSchema);

async function createSuperUser() {
  try {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to local MongoDB successfully');

    const superUserEmail = 'super@orion-led.com';
    const superUserName = 'Super User';
    const superUserLocation = 'Delhi';
    const superUserPhone = '98391 77083';
    const defaultPassword = 'Super@123';

    // Check if super user already exists
    const existingUser = await SalesUser.findOne({ email: superUserEmail });
    
    if (existingUser) {
      console.log(`Super user ${superUserEmail} already exists. Updating password and role...`);
      existingUser.role = 'super';
      existingUser.passwordHash = bcrypt.hashSync(defaultPassword, 12);
      existingUser.mustChangePassword = true;
      existingUser.passwordSetAt = null;
      await existingUser.save();
      console.log('Super user updated successfully');
    } else {
      console.log('Creating new super user...');
      
      // Create password hash
      const passwordHash = bcrypt.hashSync(defaultPassword, 12);
      
      // Create new super user
      const superUser = new SalesUser({
        email: superUserEmail,
        name: superUserName,
        location: superUserLocation,
        contactNumber: superUserPhone,
        passwordHash,
        mustChangePassword: true,
        passwordSetAt: null,
        role: 'super'
      });

      await superUser.save();
      console.log('Super user created successfully');
    }

    console.log('\nSuper User Details:');
    console.log(`Email: ${superUserEmail}`);
    console.log(`Name: ${superUserName}`);
    console.log(`Location: ${superUserLocation}`);
    console.log(`Phone: ${superUserPhone}`);
    console.log(`Default Password: ${defaultPassword}`);
    console.log(`Role: super`);
    console.log('\nNote: The user will be prompted to change their password on first login.');

  } catch (error) {
    console.error('Error creating super user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSuperUser();
