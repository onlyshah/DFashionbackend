const { sequelize } = require('./models_sql');

async function verifyRoleDistribution() {
  try {
    await sequelize.authenticate();
    console.log('\n✅ PostgreSQL Connected\n');
    console.log('═'.repeat(70));
    console.log('📊 ROLE DISTRIBUTION VERIFICATION');
    console.log('═'.repeat(70) + '\n');

    const result = await sequelize.query(`
      SELECT 
        u.role as role_name,
        COUNT(u.id) as user_count,
        STRING_AGG(u.username, ', ' ORDER BY u.username) as usernames
      FROM users u
      GROUP BY u.role
      ORDER BY user_count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    let totalUsers = 0;
    console.log('Role Distribution:\n');
    
    for (const row of result) {
      const count = parseInt(row.user_count) || 0;
      totalUsers += count;
      const percentage = ((count / 45) * 100).toFixed(1);
      
      console.log(`🔹 ${row.role_name.toUpperCase().padEnd(15)} → ${count} users (${percentage}%)`);
      if (row.usernames && count > 0) {
        console.log(`   Users: ${row.usernames.substring(0, 60)}${row.usernames.length > 60 ? '...' : ''}`);
      }
      console.log();
    }

    console.log('═'.repeat(70));
    console.log(`\n📈 Total Users Seeded: ${totalUsers}/45\n`);

    // Verify each role has the correct number
    const verification = [
      { role: 'super_admin', expected: 1 },
      { role: 'admin', expected: 4 },
      { role: 'manager', expected: 10 },
      { role: 'customer', expected: 30 }
    ];

    console.log('Verification Results:\n');
    let allCorrect = true;
    
    for (const check of verification) {
      const actual = result.find(r => r.role_name === check.role);
      const actualCount = parseInt(actual?.user_count) || 0;
      const status = actualCount === check.expected ? '✅' : '❌';
      
      if (actualCount !== check.expected) allCorrect = false;
      
      console.log(`${status} ${check.role.padEnd(15)} → Expected: ${check.expected}, Actual: ${actualCount}`);
    }

    console.log('\n' + '═'.repeat(70));
    
    if (allCorrect) {
      console.log('\n🎉 SUCCESS! All roles properly distributed!\n');
    } else {
      console.log('\n⚠️ Some roles are not correctly distributed!\n');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

verifyRoleDistribution();
