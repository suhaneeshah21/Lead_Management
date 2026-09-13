require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const config = require('../src/config');

async function seedDummyLeads() {
  await mongoose.connect(config.mongoUri);
  const agent =
    (await User.findOne({ role: 'agent', isActive: true })) ||
    (await User.findOne({ role: 'admin' }));

  if (!agent) {
    throw new Error('Run seed-admin first');
  }

  const names = ['Aarav Mehta', 'Nisha Shah', 'Kabir Rao'];
  await Lead.insertMany(
    names.map((name, index) => ({
      name,
      phone: `900000000${index}`,
      email: `lead${index}@example.com`,
      budget: 5000000 + index * 1000000,
      location: 'Pune',
      propertyType: '2BHK',
      source: 'Website',
      assignedAgent: agent._id,
      activities: [
        {
          action: 'created',
          detail: 'Seed lead',
          performedBy: agent.name,
        },
      ],
    }))
  );

  console.log('Dummy leads seeded');
  await mongoose.disconnect();
}

seedDummyLeads().catch((error) => {
  console.error(error);
  process.exit(1);
});
