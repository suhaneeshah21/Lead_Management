const app = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

async function startServer() {
  try {
    await connectDatabase();
    await connectRedis();
    app.listen(config.port, () => {
      logger.info(`API listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error(error.stack || error.message);
    process.exit(1);
  }
}

startServer();
