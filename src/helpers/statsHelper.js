// src/helpers/statsHelper.js
const { db } = require('../config/firebase');
const { redisClient } = require('../config/redis');

const broadcastStats = async (areaId = null) => {
  try {
    let slotsRef = db.collection('slots');
    
    if (areaId) {
        slotsRef = slotsRef.where('areaId', '==', areaId);
    }

    const snapshot = await slotsRef.get();
    let stats = { available: 0, booked: 0, occupied: 0, maintenance: 0 };

    snapshot.forEach(doc => {
      const s = doc.data();
      const status = ['available', 'booked', 'occupied', 'maintenance'].includes(s.appStatus) 
          ? s.appStatus 
          : 'available';
      stats[status]++;
    });

    const payload = {
        areaId: areaId || 'GLOBAL',
        stats: stats
    };

    await redisClient.publish('parkfinderStats', JSON.stringify(payload));
    // console.log(`[STATS] Broadcasted for ${areaId || 'GLOBAL'}:`, stats);

  } catch (err) {
    console.error('[STATS ERROR]', err);
  }
};

module.exports = { broadcastStats };