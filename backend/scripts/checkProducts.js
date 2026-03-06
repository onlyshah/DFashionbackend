const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1234', database: 'dfashion' });
  try {
    await client.connect();
    const r = await client.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 LIMIT 10', ['products']);
    console.log('Products columns:');
    r.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
    await client.end();
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
