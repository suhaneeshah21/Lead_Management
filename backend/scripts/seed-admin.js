require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const config = require('../src/config');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  }

  await mongoose.connect(config.mongoUri);
  const existing = await User.findOne({ email });

  if (!existing) {
    await User.create({
      name: process.env.ADMIN_NAME || 'CRM Admin',
      email,
      password,
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
