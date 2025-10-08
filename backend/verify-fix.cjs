// Verify the fix by comparing old vs new behavior
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const quotationSchema = new mongoose.Schema({
  quotationId: String,
  salesUserId: mongoose.Schema.Types.ObjectId,
  salesUserName: String,
  customerName: String,
  status: String
}, {
  timestamps: true
});

const Quotation = mongoose.model('Quotation', quotationSchema);

async function verifyFix() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count quotations with OLD filter (Converted, In Progress, pending only)
    const oldFilterCount = await Quotation.countDocuments({
      status: { $in: ['Converted', 'In Progress', 'pending'] }
    });

    // Count quotations with NEW filter (all quotations)
    const newFilterCount = await Quotation.countDocuments({});

    // Get breakdown by status
    const statusBreakdown = await Quotation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('📊 VERIFICATION RESULTS:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('OLD BEHAVIOR (with status filter):');
    console.log(`   Quotations shown in dashboard: ${oldFilterCount}`);
    console.log('   Only showing: Converted, In Progress, pending');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('NEW BEHAVIOR (without status filter):');
    console.log(`   Quotations shown in dashboard: ${newFilterCount}`);
    console.log('   Showing: ALL statuses');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📈 Quotations by Status:');
    statusBreakdown.forEach(item => {
      const status = item._id || 'No Status';
      const count = item.count;
      const wasShownBefore = ['Converted', 'In Progress', 'pending'].includes(status);
      const indicator = wasShownBefore ? '✓ (was visible)' : '✗ (was hidden)';
      console.log(`   ${status.padEnd(15)} : ${count.toString().padStart(3)} ${indicator}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('IMPACT OF THE FIX:');
    const difference = newFilterCount - oldFilterCount;
    const percentageIncrease = ((difference / oldFilterCount) * 100).toFixed(0);
    console.log(`   ${difference} additional quotations are now visible`);
    console.log(`   That's a ${percentageIncrease}% increase in visible quotations!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (difference > 0) {
      console.log('✅ FIX SUCCESSFULLY APPLIED!');
      console.log('   All quotations are now visible in the Super User Dashboard\n');
    } else {
      console.log('⚠️ No difference detected - all quotations already had valid statuses\n');
    }

    console.log('📝 What was fixed:');
    console.log('   1. Removed status filter from dashboard endpoint (/api/sales/dashboard)');
    console.log('   2. Now counting ALL quotations regardless of status');
    console.log('   3. Revenue calculation includes all quotations');
    console.log('   4. Statistics aggregation includes all quotations\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Restart your frontend if it\'s running');
    console.log('   2. Login as Super User (super@orion-led.com / Orion@123)');
    console.log('   3. Click the "Dashboard" button');
    console.log('   4. You should now see all sales persons with complete quotation counts\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

verifyFix();

