const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1234', database: 'dfashion' });
  try {
    await client.connect();
    const result = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('is_influencer', 'followers_count');`);
    console.log('users columns:', result.rows);

    const allUsers = await client.query('SELECT email, is_influencer, followers_count FROM users;');
    console.log('users rows:', allUsers.rows);
  } catch (error) {
    console.error('checkUserColumns error:', error.message);
  } finally {
    await client.end();
    process.exit(0);
  }
})();