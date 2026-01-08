const bcrypt = require('bcryptjs');
const path = require('path');

async function run() {
  try {
    const db = require(path.join(__dirname, '..', 'config', 'database'));
    await db.connectDB();

    // Require the Mongoose User model directly
    const User = require(path.join(__dirname, '..', 'models', 'User'));

    if (!User) throw new Error('Mongo User model not found');

    const email = 'superadmin@dfashion.com';
    const username = 'superadmin';
    const plain = 'SuperAdmin123!';

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(plain, salt);

    // Upsert by email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.username = username;
      existing.password = hashed;
      existing.fullName = 'Super Admin';
      existing.role = 'super_admin';
      existing.department = 'administration';
      existing.isActive = true;
      await existing.save();
      console.log('✅ Superadmin updated (MongoDB)');
    } else {
      const user = new User({
        username,
        email: email.toLowerCase(),
        password: hashed,
        fullName: 'Super Admin',
        role: 'super_admin',
        department: 'administration',
        isActive: true,
        isVerified: true
      });
      await user.save();
      console.log('✅ Superadmin created (MongoDB)');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create superadmin (MongoDB):', err.message || err);
    process.exit(1);
  }
}

run();
