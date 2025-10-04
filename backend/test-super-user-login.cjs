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

async function testSuperUserLogin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    const superUserEmail = 'super@orion-led.com';
    const testPassword = 'Super@123';

    // Check if super user exists
    const superUser = await SalesUser.findOne({ email: superUserEmail });
    
    if (!superUser) {
      console.log('❌ Super user not found! Creating one...');
      
      // Create password hash
      const passwordHash = bcrypt.hashSync(testPassword, 12);
      
      // Create new super user
      const newSuperUser = new SalesUser({
        email: superUserEmail,
        name: 'Super User',
        location: 'Delhi',
        contactNumber: '98391 77083',
        passwordHash,
        mustChangePassword: true,
        passwordSetAt: null,
        role: 'super'
      });

      await newSuperUser.save();
      console.log('✅ Super user created successfully');
    } else {
      console.log('✅ Super user found');
      console.log(`   Email: ${superUser.email}`);
      console.log(`   Name: ${superUser.name}`);
      console.log(`   Role: ${superUser.role}`);
      console.log(`   Must Change Password: ${superUser.mustChangePassword}`);
    }

    // Test password verification
    const user = await SalesUser.findOne({ email: superUserEmail });
    if (user) {
      const isPasswordValid = bcrypt.compareSync(testPassword, user.passwordHash);
      console.log(`✅ Password verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`);
      
      if (!isPasswordValid) {
        console.log('❌ Password verification failed. Resetting password...');
        user.passwordHash = bcrypt.hashSync(testPassword, 12);
        user.mustChangePassword = true;
        await user.save();
        console.log('✅ Password reset successfully');
      }
    }

    // List all users with super role
    const allSuperUsers = await SalesUser.find({ role: 'super' });
    console.log(`\n📊 Total super users in database: ${allSuperUsers.length}`);
    allSuperUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.name})`);
    });

  } catch (error) {
    console.error('❌ Error testing super user login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testSuperUserLogin();


