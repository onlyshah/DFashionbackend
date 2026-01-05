const bcrypt = require('bcryptjs');
const path = require('path');

async function run() {
  try {
    // Use unified models entry
    const models = require(path.join(__dirname, '..', 'models_sql'));
    const { sequelize } = models;
    const User = models._raw && models._raw.User ? models._raw.User : models.User;

    if (!User) throw new Error('Postgres User model not found');

    await sequelize.authenticate();
    console.log('✅ Connected to Postgres');

    const email = 'superadmin@dfashion.com';
    const username = 'superadmin';
    const plain = 'SuperAdmin123!';

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(plain, salt);

    // Upsert user by email
    const [user, created] = await User.upsert({
      username,
      email,
      password: hashed,
      fullName: 'Super Admin',
      role: 'super_admin',
      department: 'administration',
      isActive: true
    }, { returning: true });

    console.log(created ? '✅ Superadmin created' : '✅ Superadmin upserted');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create superadmin:', err.message || err);
    process.exit(1);
  }
}

run();
