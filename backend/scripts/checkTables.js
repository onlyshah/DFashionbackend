const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1234', database: 'dfashion' });
  try {
    await client.connect();
    const tables = ['inventory','orders','creators','invoice','order_items','comments','hashtags','live_streams'];
    for (const tbl of tables) {
      try {
        const r = await client.query(`select count(*) from "${tbl}"`);
        console.log(tbl, 'count', r.rows[0].count);
      } catch (e) {
        console.log(tbl, 'error', e.message);
      }
    }
  } catch (e) {
    console.error('connection error', e.message);
  } finally {
    await client.end();
  }
})();
