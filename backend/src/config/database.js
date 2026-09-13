const mongoose = require('mongoose');
const config = require('./index');

async function connectDatabase() {
  await mongoose.connect(config.mongoUri);
  return mongoose.connection;
}

module.exports = { connectDatabase };
