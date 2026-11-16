require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const config = require('../src/config');

const requiredVariables = [
  'DEMO_ADMIN_EMAIL',
  'DEMO_ADMIN_PASSWORD',
  'DEMO_AGENT_EMAIL',
  'DEMO_AGENT_PASSWORD',
];

const sampleLeads = [
  [
    'Aarav Mehta',
    '9000000001',
    'aarav.mehta@example.test',
    8500000,
    'Pune',
    '2BHK',
    'Website',
    'New',
    1,
  ],
  [
    'Nisha Shah',
    '9000000002',
    'nisha.shah@example.test',
    12500000,
    'Mumbai',
    '3BHK',
    'Referral',
    'Contacted',
    4,
  ],
  [
    'Kabir Rao',
    '9000000003',
    'kabir.rao@example.test',
    6200000,
    'Bengaluru',
    '2BHK',
    'Google',
    'Site Visit',
    8,
  ],
  [
    'Meera Iyer',
    '9000000004',
    'meera.iyer@example.test',
    4500000,
    'Chennai',
    '1BHK',
    'Facebook',
    'Closed',
    12,
  ],
  [
    'Rohan Verma',
    '9000000005',
    'rohan.verma@example.test',
    18000000,
    'Delhi',
    'Villa',
    'Walk-in',
    'New',
    2,
  ],
  [
    'Ishita Kapoor',
    '9000000006',
    'ishita.kapoor@example.test',
    7200000,
    'Noida',
    '2BHK',
    'Website',
    'Contacted',
    6,
  ],
  [
    'Dev Malhotra',
    '9000000007',
    'dev.malhotra@example.test',
    30000000,
    'Gurugram',
    'Commercial',
    'Referral',
    'Site Visit',
    15,
  ],
  [
    'Ananya Desai',
    '9000000008',
    'ananya.desai@example.test',
    5600000,
    'Ahmedabad',
    '2BHK',
    'Google',
    'New',
    3,
  ],
  [
    'Vikram Joshi',
    '9000000009',
    'vikram.joshi@example.test',
    9800000,
    'Jaipur',
    '3BHK',
    'Facebook',
    'Closed',
    21,
  ],
  [
    'Sara Fernandes',
    '9000000010',
    'sara.fernandes@example.test',
    4100000,
    'Goa',
    '1BHK',
    'Website',
    'Contacted',
    9,
  ],
  [
    'Yash Kulkarni',
    '9000000011',
    'yash.kulkarni@example.test',
    6700000,
    'Nagpur',
    'Plot',
    'Walk-in',
    'New',
    5,
  ],
  [
    'Priya Nair',
    '9000000012',
    'priya.nair@example.test',
    11500000,
    'Kochi',
    '3BHK',
    'Referral',
    'Site Visit',
    18,
  ],
  [
    'Aditya Sethi',
    '9000000013',
    'aditya.sethi@example.test',
    7600000,
    'Chandigarh',
    '2BHK',
    'Google',
    'Contacted',
    7,
  ],
  [
    'Tara Banerjee',
    '9000000014',
    'tara.banerjee@example.test',
    21500000,
    'Kolkata',
    'Villa',
    'Website',
    'Closed',
    30,
  ],
  [
    'Neil Thomas',
    '9000000015',
    'neil.thomas@example.test',
    5200000,
    'Hyderabad',
    'Other',
    'Facebook',
    'New',
    11,
  ],
];

function missingVariables() {
  return requiredVariables.filter((name) => !process.env[name]);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function upsertDemoUser(email, password, name, role) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        isDemo: true,
        isActive: true,
        mustChangePassword: false,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function seedDemo() {
  if (!process.argv.includes('--confirm')) {
    console.log(
      'Demo seed would upsert two demo users, delete all leads, and insert 15 sample leads.'
    );
    console.log('Run with --confirm to apply these changes.');
    return;
  }

  const missing = missingVariables();
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.DEMO_ADMIN_EMAIL.toLowerCase() === process.env.DEMO_AGENT_EMAIL.toLowerCase()) {
    throw new Error('DEMO_ADMIN_EMAIL and DEMO_AGENT_EMAIL must be different');
  }

  await mongoose.connect(config.mongoUri);
  const demoAdmin = await upsertDemoUser(
    process.env.DEMO_ADMIN_EMAIL,
    process.env.DEMO_ADMIN_PASSWORD,
    'Demo Admin',
    'admin'
  );
  const demoAgent = await upsertDemoUser(
    process.env.DEMO_AGENT_EMAIL,
    process.env.DEMO_AGENT_PASSWORD,
    'Demo Agent',
    'agent'
  );

  await Lead.deleteMany({});
  await Lead.insertMany(
    sampleLeads.map(
      ([name, phone, email, budget, location, propertyType, source, status, age], index) => {
        const createdAt = daysAgo(age);
        return {
          name,
          phone,
          email,
          budget,
          location,
          propertyType,
          source,
          status,
          assignedAgent: index % 3 === 0 ? undefined : demoAgent._id,
          followUpDate: status === 'Closed' ? null : daysAgo((index % 5) - 2),
          createdAt,
          updatedAt: createdAt,
          activities: [
            {
              action: 'created',
              detail: 'Demo lead created',
              performedBy: index % 3 === 0 ? demoAdmin.name : demoAgent.name,
              createdAt,
            },
          ],
        };
      }
    )
  );

  console.log('Demo users upserted and demo leads reset.');
  await mongoose.disconnect();
}

seedDemo().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exit(1);
});
