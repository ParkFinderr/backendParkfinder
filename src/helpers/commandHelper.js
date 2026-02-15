const { redisClient } = require('../config/redis');
const CHANNELS = require('../constants/channels');

const publishCommand = async (action, slotId, status, slotName, reason = '', areaId = null) => {
  try {
    const payload = {
      action,
      slotId,
      status,
      slotName,
      reason,
      areaId: areaId 
    };

    await redisClient.publish(CHANNELS.REDIS.CMD, JSON.stringify(payload));
    
  } catch (error) {
    console.error('[COMMAND HELPER ERROR]', error);
  }
};

module.exports = { publishCommand };