const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1234', database: 'dfashion' });
  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    console.log('tables', res.rows.map(r => r.table_name));
  } catch (e) {
    console.error(e.message);
  } finally {
    await client.end();
  }
})();
