/**
 * TICKETS SEEDER
 * Seeds customer support tickets
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedTickets() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Ticket seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Ticket = models._raw?.Ticket || models.Ticket;
    const User = models._raw?.User || models.User;

    if (!Ticket || !Ticket.create) throw new Error('Ticket model not available');

    const users = await User.findAll({ limit: 4 });

    if (users.length === 0) {
      console.log('⚠️  Skipping Ticket seeding - no users found');
      return true;
    }

    const count = await Ticket.count();
    if (count > 0) {
      console.log(`✅ Ticket data already exists (${count} records)`);
      return true;
    }

    const categories = ['order_issue', 'product_quality', 'delivery', 'return', 'payment', 'account'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];

    const tickets = [];
    for (let i = 0; i < 8; i++) {
      tickets.push({
        id: uuidv4(),
        ticketNumber: 'TKT' + Math.floor(Math.random() * 100000),
        userId: users[i % users.length].id,
        category: categories[i % categories.length],
        subject: `Support Issue ${i + 1}`,
        description: `Customer support ticket regarding ${categories[i % categories.length]}`,
        priority: priorities[i % priorities.length],
        status: statuses[i % statuses.length],
        assignedTo: users[(i + 1) % users.length].id,
        resolvedAt: ['resolved', 'closed'].includes(statuses[i % statuses.length]) ? new Date() : null
      });
    }

    let createdCount = 0;
    for (const ticket of tickets) {
      try {
        await Ticket.create(ticket);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  Ticket creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ Ticket seeding completed (${createdCount} new tickets)\n`);
    return true;
  } catch (error) {
    console.error('❌ Ticket seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedTickets };
