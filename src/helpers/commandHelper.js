const { db } = require('../config/firebase');
const { redisClient } = require('../config/redis');

const publishCommand = async (action, slotId, status, slotName = null, reason = null, expiryTime = null) => {
  try {
    let name = slotName;
    
    if (!name) {
      const slotDoc = await db.collection('slots').doc(slotId).get();
      if (slotDoc.exists) name = slotDoc.data().slotName;
    }

    if (name) {
      const payload = {
        action,
        slotId,
        slotName: name,
        status,
        reason,
        expiryTime
      };

      await redisClient.publish('parkfinderCommands', JSON.stringify(payload));
      console.log(`[CMD] ${action} -> ${name} (Status: ${status})`);
    }
  } catch (err) {
    console.error('[COMMAND HELPER ERROR]', err);
  }
};

module.exports = { publishCommand };