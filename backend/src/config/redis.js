const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on('error', (error) => {
  logger.warn(`Redis unavailable: ${error.message}`);
});

async function connectRedis() {
  try {
    await redis.connect();
  } catch (error) {
    logger.warn(`Redis connection skipped: ${error.message}`);
  }
}

async function cacheGet(key) {
  try {
    return await redis.get(key);
  } catch (error) {
    logger.warn(`Redis read skipped: ${error.message}`);
    return null;
  }
}

async function cacheSet(key, value, seconds) {
  try {
    await redis.set(key, value, 'EX', seconds);
  } catch (error) {
    logger.warn(`Redis write skipped: ${error.message}`);
  }
}

async function cacheDelete(key) {
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn(`Redis delete skipped: ${error.message}`);
  }
}

async function cacheDeletePattern(pattern) {
  try {
    const keys = [];
    const stream = redis.scanStream({ match: pattern, count: 100 });
    for await (const batch of stream) keys.push(...batch);
    if (keys.length) await redis.del(...keys);
  } catch (error) {
    logger.warn(`Redis pattern delete skipped: ${error.message}`);
  }
}

module.exports = { redis, connectRedis, cacheGet, cacheSet, cacheDelete, cacheDeletePattern };
