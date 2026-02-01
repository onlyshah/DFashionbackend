const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('dfashion', 'postgres', '1234', { host: 'localhost', dialect: 'postgres' });

async function checkUser() {
  try {
    const result = await sequelize.query('SELECT id, email, username, "roleId" FROM "Users" WHERE email = \'superadmin@dfashion.com\'');
    console.log('Superadmin user:', result[0][0]);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUser();