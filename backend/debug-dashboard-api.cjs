/**
 * DEBUG DASHBOARD API SCRIPT
 * 
 * This script simulates the exact API call that the Super User Dashboard makes
 * to help debug what data is being returned.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// SalesUser Schema
const salesUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  location: String,
  contactNumber: String,
  role: String
}, { timestamps: true });

const SalesUser = mongoose.model('SalesUser', salesUserSchema);

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  quotationId: String,
  salesUserId: mongoose.Schema.Types.ObjectId,
  totalPrice: Number,
  productName: String,
  customerName: String,
  status: String,
  createdAt: Date
});

const Quotation = mongoose.model('Quotation', quotationSchema);

async function debugDashboardAPI() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 DEBUG DASHBOARD API RESPONSE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Simulate the exact dashboard API logic
    console.log('📡 Simulating GET /api/sales/dashboard API call...\n');

    // Get all sales users
    const salesUsers = await SalesUser.find()
      .select('name email location contactNumber createdAt role')
      .lean();

    console.log(`👥 Found ${salesUsers.length} sales users`);

    // Get quotation counts for each user (all statuses)
    const usersWithQuotationCounts = await Promise.all(
      salesUsers.map(async (user) => {
        const quotationCount = await Quotation.countDocuments({
          salesUserId: user._id
        });

        // Get revenue only for 'Converted' quotations
        const revenueResult = await Quotation.aggregate([
          {
            $match: {
              salesUserId: user._id,
              status: 'Converted'
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalPrice' }
            }
          }
        ]);

        const revenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          location: user.location,
          contactNumber: user.contactNumber,
          role: user.role,
          quotationCount: quotationCount,
          revenue: revenue
        };
      })
    );

    // Calculate stats
    const totalSalesPersons = usersWithQuotationCounts.length;
    const totalQuotations = usersWithQuotationCounts.reduce((sum, person) => sum + person.quotationCount, 0);
    const activeUsers = usersWithQuotationCounts.filter(person => person.quotationCount > 0).length;
    const topPerformers = usersWithQuotationCounts
      .filter(person => person.quotationCount > 0)
      .sort((a, b) => b.quotationCount - a.quotationCount)
      .slice(0, 3);
    const totalRevenue = usersWithQuotationCounts.reduce((sum, person) => sum + person.revenue, 0);
    const averageQuotationsPerUser = totalSalesPersons > 0 ? totalQuotations / totalSalesPersons : 0;

    // Simulate the exact API response structure
    const apiResponse = {
      success: true,
      data: usersWithQuotationCounts,
      stats: {
        totalSalesPersons,
        totalQuotations,
        activeUsers,
        topPerformers,
        totalRevenue,
        averageQuotationsPerUser,
        quotationsByMonth: [] // Simplified for debug
      }
    };

    console.log('📊 API RESPONSE STRUCTURE:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Success:', apiResponse.success);
    console.log('Total Sales Persons:', apiResponse.stats.totalSalesPersons);
    console.log('Total Quotations:', apiResponse.stats.totalQuotations);
    console.log('Active Users:', apiResponse.stats.activeUsers);
    console.log('Total Revenue:', apiResponse.stats.totalRevenue);
    console.log('Average Quotations per User:', apiResponse.stats.averageQuotationsPerUser.toFixed(2));

    console.log('\n👥 SALES PERSONS WITH QUOTATIONS:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const usersWithQuotations = usersWithQuotationCounts.filter(user => user.quotationCount > 0);
    
    if (usersWithQuotations.length === 0) {
      console.log('❌ No users have quotations!');
    } else {
      usersWithQuotations.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Location: ${user.location}`);
        console.log(`   Quotation Count: ${user.quotationCount}`);
        console.log(`   Revenue: ₹${user.revenue.toLocaleString('en-IN')}`);
        console.log('');
      });
    }

    // Check specific user details
    const anshika = usersWithQuotationCounts.find(u => u.email === 'anshika.trivedi@orion-led.com');
    if (anshika) {
      console.log('🔍 ANSHIKA TRIVEDI DETAILS:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Name:', anshika.name);
      console.log('Email:', anshika.email);
      console.log('Location:', anshika.location);
      console.log('Quotation Count:', anshika.quotationCount);
      console.log('Revenue:', anshika.revenue);
      
      // Get her quotations
      const anshikaQuotations = await Quotation.find({ salesUserId: anshika._id }).lean();
      console.log('\n📋 Her Quotations:');
      anshikaQuotations.forEach((q, i) => {
        console.log(`   ${i + 1}. ID: ${q.quotationId}`);
        console.log(`      Product: ${q.productName}`);
        console.log(`      Price: ₹${q.totalPrice.toLocaleString('en-IN')}`);
        console.log(`      Status: ${q.status}`);
        console.log(`      Created: ${new Date(q.createdAt).toLocaleString('en-IN')}`);
      });
    }

    console.log('\n📝 FRONTEND EXPECTATIONS:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('The Super User Dashboard should show:');
    console.log(`- ${totalSalesPersons} total sales persons`);
    console.log(`- ${totalQuotations} total quotations`);
    console.log(`- ${activeUsers} active users (with quotations)`);
    console.log(`- ₹${totalRevenue.toLocaleString('en-IN')} total revenue`);
    
    if (anshika) {
      console.log(`- Anshika Trivedi should show ${anshika.quotationCount} quotations`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ DEBUG COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the debug
debugDashboardAPI();
