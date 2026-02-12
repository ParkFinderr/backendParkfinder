const { createClient } = require('redis');

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

const connectionUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

console.log(`[REDIS CONFIG] Connecting to: ${connectionUrl}`);

const redisClient = createClient({
  url: connectionUrl
});

redisClient.on('error', (err) => console.log('❌ Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Terhubung ke Redis Server'));

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

module.exports = { redisClient, connectRedis };