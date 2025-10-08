// Seeder for styleinspirations table
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dfashion',
});

const seedData = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Summer Chic',
    description: 'Light and breezy summer styles for 2025.',
    image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Urban Streetwear',
    description: 'Trendy streetwear looks for city life.',
    image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Minimalist Office',
    description: 'Clean and professional outfits for work.',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
  },
];

async function seed() {
  await client.connect();
  for (const inspiration of seedData) {
    await client.query(
      'INSERT INTO styleinspirations (user_id, title, description, image_url) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [inspiration.user_id, inspiration.title, inspiration.description, inspiration.image_url]
    );
  }
  await client.end();
  console.log('StyleInspirations seeded!');
}

seed().catch(e => { console.error(e); process.exit(1); });
