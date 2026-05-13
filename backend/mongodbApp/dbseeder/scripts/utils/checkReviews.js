const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1234', database: 'dfashion' });
  try {
    await client.connect();
    const tables = ['reviews', 'ratings', 'product_reviews', 'product_ratings', 'review_ratings', 'product_comments'];
    for (const t of tables) {
      try {
        const r = await client.query(`select count(*) from "${t}"`);
        console.log(t, 'count:', r.rows[0].count);
      } catch (e) {
        console.log(t, 'error: table does not exist');
      }
    }
    await client.end();
  } catch (e) {
    console.log('error:', e.message);
  }
})();
