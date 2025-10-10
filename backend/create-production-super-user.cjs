const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use your production MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://anshikatrivedi:anshika123@cluster0.8jqjq.mongodb.net/configurator?retryWrites=true&w=majority';

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

async function createProductionSuperUser() {
  try {
    console.log('Connecting to production MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production MongoDB successfully');

    const superUserEmail = 'super@orion-led.com';
    const superUserName = 'Super User';
    const superUserLocation = 'Delhi';
    const superUserPhone = '98391 77083';
    const defaultPassword = 'Orion@123';

    // Check if super user already exists
    const existingUser = await SalesUser.findOne({ email: superUserEmail });
    
    if (existingUser) {
      console.log(`Super user ${superUserEmail} already exists. Updating password and role...`);
      existingUser.role = 'super';
      existingUser.passwordHash = bcrypt.hashSync(defaultPassword, 10);
      existingUser.mustChangePassword = true;
      existingUser.passwordSetAt = null;
      await existingUser.save();
      console.log('✅ Super user updated successfully');
    } else {
      console.log('Creating new super user...');
      
      // Create password hash
      const passwordHash = bcrypt.hashSync(defaultPassword, 10);
      
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
      console.log('✅ Super user created successfully');
    }

    console.log('\n🎉 Super User Details:');
    console.log(`Email: ${superUserEmail}`);
    console.log(`Name: ${superUserName}`);
    console.log(`Location: ${superUserLocation}`);
    console.log(`Phone: ${superUserPhone}`);
    console.log(`Password: ${defaultPassword}`);
    console.log(`Role: super`);
    console.log('\n✅ You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error creating super user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createProductionSuperUser();
