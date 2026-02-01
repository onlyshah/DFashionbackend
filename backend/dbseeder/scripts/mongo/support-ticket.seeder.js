// Support Ticket Seeder Script - PostgreSQL
// Seeds sample support tickets for customer service tracking
// Usage: node scripts/support-ticket.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Ticket;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping support-ticket.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const TICKETS_DATA = [
  { ticket_number: 'TK-001', title: 'Order Delivery Issue', description: 'Package not delivered as expected', status: 'open', priority: 'high', category: 'shipping', created_date: new Date(Date.now() - 7*24*60*60*1000), last_updated: new Date(Date.now() - 2*24*60*60*1000) },
  { ticket_number: 'TK-002', title: 'Product Quality Complaint', description: 'Received damaged item', status: 'in-progress', priority: 'high', category: 'quality', created_date: new Date(Date.now() - 5*24*60*60*1000), last_updated: new Date(Date.now() - 1*24*60*60*1000) },
  { ticket_number: 'TK-003', title: 'Refund Status Query', description: 'Want to check refund status', status: 'open', priority: 'medium', category: 'payment', created_date: new Date(Date.now() - 3*24*60*60*1000), last_updated: new Date(Date.now() - 1*24*60*60*1000) },
  { ticket_number: 'TK-004', title: 'Account Login Issue', description: 'Unable to login to account', status: 'resolved', priority: 'high', category: 'account', created_date: new Date(Date.now() - 2*24*60*60*1000), last_updated: new Date(Date.now() - 0.5*24*60*60*1000) },
  { ticket_number: 'TK-005', title: 'Size Exchange Request', description: 'Need to exchange size', status: 'open', priority: 'medium', category: 'returns', created_date: new Date(Date.now() - 1*24*60*60*1000), last_updated: new Date() }
];

async function seedTickets() {
  try {
    console.log('🚀 Starting PostgreSQL Support Ticket Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Ticket = modelsModule._raw.Ticket;
    if (!Ticket) throw new Error('Ticket model not initialized');
    if (!sequelize) throw new Error('Failed to initialize sequelize');    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    const existing = await Ticket.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing tickets. Clearing...\n`);
      await Ticket.destroy({ where: {} });
    }

    console.log('📝 Seeding support tickets...');
    let seededCount = 0;
    for (const ticketData of TICKETS_DATA) {
      const ticket = await Ticket.create(ticketData);
      console.log(`  ✓ Created ticket: ${ticket.ticket_number}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} support tickets\n`);
    console.log('═'.repeat(50));
    console.log('SUPPORT TICKET SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Tickets:');
    TICKETS_DATA.forEach(t => console.log(`  • ${t.ticket_number} - ${t.title} (${t.status})`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Support Ticket Seeding failed:', error.message);
    process.exit(1);
  }
}

seedTickets();
