// Seeder for productshares table
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dfashion',
});

const seedData = [
  {
    product_id: '750e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    platform: 'facebook',
  },
  {
    product_id: '750e8400-e29b-41d4-a716-446655440002',
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    platform: 'instagram',
  },
  {
    product_id: '750e8400-e29b-41d4-a716-446655440003',
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    platform: 'twitter',
  },
  {
    product_id: '750e8400-e29b-41d4-a716-446655440004',
    user_id: '550e8400-e29b-41d4-a716-446655440004',
    platform: 'whatsapp',
  },
];

async function seed() {
  await client.connect();
  for (const share of seedData) {
    await client.query(
      'INSERT INTO productshares (product_id, user_id, platform) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [share.product_id, share.user_id, share.platform]
    );
  }
  await client.end();
  console.log('ProductShares seeded!');
}

seed().catch(e => { console.error(e); process.exit(1); });
