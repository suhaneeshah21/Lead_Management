require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const config = require('../src/config');

async function seedAdmin() {
  await mongoose.connect(config.mongoUri);
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const existing = await User.findOne({ email });

  if (!existing) {
    await User.create({
      name: process.env.ADMIN_NAME || 'CRM Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'Admin1234!',
      role: 'admin',
      mustChangePassword: false,
    });
  }

  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
