const { Client } = require('pg');

async function debugQuery() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '1234',
    database: 'dfashion'
  });

  try {
    await client.connect();
    console.log('\n========== DATABASE INVENTORY CHECK ==========\n');

    // Get all roles
    const rolesRes = await client.query('SELECT id, name FROM roles ORDER BY name');
    console.log('📋 ROLES:');
    rolesRes.rows.forEach(r => console.log(`   ${r.name}: ${r.id}`));

    // For each role, count users
    console.log('\n👥 USERS PER ROLE:');
    for (const role of rolesRes.rows) {
      const countRes = await client.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [role.id]);
      console.log(`   ${role.name}: ${countRes.rows[0].count} users`);
      
      // Show users
      const usersRes = await client.query('SELECT username, email FROM users WHERE role_id = $1', [role.id]);
      usersRes.rows.forEach(u => console.log(`      - ${u.username} (${u.email})`));
    }

    // Total summary
    const totalRes = await client.query('SELECT COUNT(*) FROM users');
    console.log(`\n📊 TOTAL: ${totalRes.rows[0].count} users`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

debugQuery();
