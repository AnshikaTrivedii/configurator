// Check quotations in database - diagnose the issue
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// Define schemas
const quotationSchema = new mongoose.Schema({
  quotationId: String,
  salesUserId: mongoose.Schema.Types.ObjectId,
  salesUserName: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  productName: String,
  productDetails: mongoose.Schema.Types.Mixed,
  message: String,
  userType: String,
  userTypeDisplayName: String,
  totalPrice: Number,
  status: String
}, {
  timestamps: true
});

const salesUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  location: String,
  contactNumber: String,
  passwordHash: String,
  mustChangePassword: Boolean,
  passwordSetAt: Date,
  role: String
}, {
  timestamps: true
});

const Quotation = mongoose.model('Quotation', quotationSchema);
const SalesUser = mongoose.model('SalesUser', salesUserSchema);

async function checkQuotations() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully\n');

    // Get all sales users
    console.log('👥 Fetching all sales users...');
    const salesUsers = await SalesUser.find({}).lean();
    console.log(`Found ${salesUsers.length} sales users:\n`);
    
    salesUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role || 'sales'}`);
      console.log(`   ID: ${user._id}`);
    });

    console.log('\n📋 Fetching all quotations...');
    const quotations = await Quotation.find({}).lean();
    console.log(`Found ${quotations.length} quotations:\n`);

    if (quotations.length === 0) {
      console.log('⚠️ NO QUOTATIONS FOUND IN DATABASE!\n');
      console.log('This means quotations are NOT being saved to the database.');
      console.log('\nPossible reasons:');
      console.log('1. The sales user is not authenticated (missing or invalid JWT token)');
      console.log('2. The QuoteModal is not being passed the correct salesUser prop');
      console.log('3. The API endpoint is not being called');
      console.log('4. There is an error in the API call that is being silently caught');
    } else {
      // Group quotations by sales user
      const quotationsByUser = {};
      
      quotations.forEach(quotation => {
        const userId = quotation.salesUserId ? quotation.salesUserId.toString() : 'unknown';
        if (!quotationsByUser[userId]) {
          quotationsByUser[userId] = [];
        }
        quotationsByUser[userId].push(quotation);
      });

      console.log('Quotations grouped by sales user:\n');
      
      for (const [userId, userQuotations] of Object.entries(quotationsByUser)) {
        const user = salesUsers.find(u => u._id.toString() === userId);
        const userName = user ? user.name : 'Unknown User';
        
        console.log(`📊 ${userName} (${userId}):`);
        console.log(`   Total quotations: ${userQuotations.length}`);
        
        userQuotations.forEach((q, index) => {
          console.log(`   ${index + 1}. ${q.quotationId} - ${q.customerName} - ${q.productName} - Status: ${q.status}`);
          console.log(`      Created: ${q.createdAt}`);
        });
        console.log('');
      }

      // Check for recent quotations (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentQuotations = quotations.filter(q => new Date(q.createdAt) > oneDayAgo);
      
      console.log(`\n⏰ Quotations created in the last 24 hours: ${recentQuotations.length}`);
      if (recentQuotations.length > 0) {
        recentQuotations.forEach((q, index) => {
          const user = salesUsers.find(u => u._id.toString() === q.salesUserId.toString());
          console.log(`   ${index + 1}. ${q.quotationId} by ${user ? user.name : 'Unknown'} - ${q.customerName}`);
        });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total Sales Users: ${salesUsers.length}`);
    console.log(`   Total Quotations: ${quotations.length}`);
    console.log(`   Average quotations per user: ${salesUsers.length > 0 ? (quotations.length / salesUsers.length).toFixed(2) : 0}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkQuotations();

