import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/configurator';

async function migrateToClients(dryRun = true) {
    try {
        await mongoose.connect(MONGODB_URI);

        const stats = {
            totalQuotations: 0,
            quotationsWithClient: 0,
            quotationsWithoutClient: 0,
            uniqueClients: 0,
            clientsCreated: 0,
            quotationsUpdated: 0,
            errors: []
        };

        // Get all quotations
        const quotations = await Quotation.find({});
        stats.totalQuotations = quotations.length;

        // Count quotations that already have clientId
        stats.quotationsWithClient = quotations.filter(q => q.clientId).length;
        stats.quotationsWithoutClient = quotations.filter(q => !q.clientId).length;

        // Extract unique clients from quotations without clientId
        const clientMap = new Map();

        for (const quotation of quotations) {
            // Skip if already has clientId
            if (quotation.clientId) continue;

            // Skip if missing customer data
            if (!quotation.customerEmail || !quotation.customerName || !quotation.customerPhone) {
                stats.errors.push({
                    quotationId: quotation.quotationId,
                    error: 'Missing customer data'
                });
                continue;
            }

            const email = quotation.customerEmail.toLowerCase().trim();

            if (!clientMap.has(email)) {
                clientMap.set(email, {
                    name: quotation.customerName.trim(),
                    email: email,
                    phone: quotation.customerPhone.trim(),
                    quotations: [quotation._id]
                });
            } else {
                clientMap.get(email).quotations.push(quotation._id);
            }
        }

        stats.uniqueClients = clientMap.size;

        if (dryRun) {
            console.log('\n📊 DRY RUN - Migration Statistics:');
            console.log('=====================================');
            console.log(`Total Quotations: ${stats.totalQuotations}`);
            console.log(`Quotations with Client: ${stats.quotationsWithClient}`);
            console.log(`Quotations without Client: ${stats.quotationsWithoutClient}`);
            console.log(`Unique Clients to Create: ${stats.uniqueClients}`);
            console.log(`\nErrors: ${stats.errors.length}`);

            if (stats.errors.length > 0) {
                console.log('\nQuotations with errors:');
                stats.errors.forEach(err => {
                    console.log(`  - ${err.quotationId}: ${err.error}`);
                });
            }

            console.log('\n📋 Sample Clients to be Created:');
            let count = 0;
            for (const [email, clientData] of clientMap.entries()) {
                if (count >= 5) break;
                console.log(`\n  ${count + 1}. ${clientData.name}`);
                console.log(`     Email: ${email}`);
                console.log(`     Phone: ${clientData.phone}`);
                console.log(`     Quotations: ${clientData.quotations.length}`);
                count++;
            }

            console.log('\n✅ Dry run complete. Run with --execute flag to perform actual migration.');
            return stats;
        }

        // ACTUAL MIGRATION
        console.log('\n🚀 Starting Migration...');
        console.log('=====================================');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create clients
            for (const [email, clientData] of clientMap.entries()) {
                try {
                    // Check if client already exists
                    let client = await Client.findOne({ email }).session(session);

                    if (!client) {
                        client = new Client({
                            name: clientData.name,
                            email: clientData.email,
                            phone: clientData.phone
                        });
                        await client.save({ session });
                        stats.clientsCreated++;
                        console.log(`✅ Created client: ${client.name} (${client.email})`);
                    } else {
                        console.log(`ℹ️  Client already exists: ${client.name} (${client.email})`);
                    }

                    // Update all quotations for this client
                    const result = await Quotation.updateMany(
                        { _id: { $in: clientData.quotations } },
                        { $set: { clientId: client._id } },
                        { session }
                    );

                    stats.quotationsUpdated += result.modifiedCount;
                    console.log(`   Updated ${result.modifiedCount} quotations`);

                } catch (error) {
                    stats.errors.push({
                        email,
                        error: error.message
                    });
                    console.error(`❌ Error processing client ${email}:`, error.message);
                }
            }

            await session.commitTransaction();
            console.log('\n✅ Migration completed successfully!');

        } catch (error) {
            await session.abortTransaction();
            console.error('\n❌ Migration failed, rolling back changes:', error);
            throw error;
        } finally {
            session.endSession();
        }

        // Final statistics
        console.log('\n📊 Final Migration Statistics:');
        console.log('=====================================');
        console.log(`Total Quotations: ${stats.totalQuotations}`);
        console.log(`Clients Created: ${stats.clientsCreated}`);
        console.log(`Quotations Updated: ${stats.quotationsUpdated}`);
        console.log(`Errors: ${stats.errors.length}`);

        if (stats.errors.length > 0) {
            console.log('\nErrors encountered:');
            stats.errors.forEach(err => {
                console.log(`  - ${err.email || err.quotationId}: ${err.error}`);
            });
        }

        return stats;

    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

// Run migration
const dryRun = !process.argv.includes('--execute');

if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...');
    console.log('No changes will be made to the database.\n');
} else {
    console.log('⚠️  Running in EXECUTE mode...');
    console.log('Changes will be made to the database.\n');
}

migrateToClients(dryRun)
    .then((stats) => {
        if (dryRun) {
            console.log('\n💡 To execute the migration, run:');
            console.log('   node backend/scripts/migrateToClients.js --execute');
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
