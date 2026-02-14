const { db } = require('../config/firebase');
const { redisClient } = require('../config/redis');

const broadcastStats = async () => {
  try {
    const allSlots = await db.collection('slots').get();
    let stats = { available: 0, booked: 0, occupied: 0, maintenance: 0 };

    allSlots.forEach(doc => {
      const s = doc.data();
      const status = ['available', 'booked', 'occupied', 'maintenance'].includes(s.appStatus) 
          ? s.appStatus 
          : 'available';
      stats[status]++;
    });

    await redisClient.publish('parkfinderStats', JSON.stringify(stats));
  } catch (err) {
    console.error('[STATS ERROR]', err);
  }
};

module.exports = { broadcastStats };