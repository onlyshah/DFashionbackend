require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models_sql');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated');
    const email = process.argv[2] || 'superadmin@dfashion.com';
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found for', email);
      process.exit(1);
    }
    console.log('User:', { id: user.id, email: user.email, username: user.username, role: user.role, isActive: user.isActive });
    console.log('Stored hashed password:', user.password);
    const testPasswords = [process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!', 'SuperAdmin123!', 'SuperAdmin123', 'SuperAdmin123\!'];
    for (const p of testPasswords) {
      const ok = await bcrypt.compare(p, user.password);
      console.log(`compare('${p}') =>`, ok);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

check();