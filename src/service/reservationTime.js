// src/services/cronService.js
const cron = require('node-cron');
const { db } = require('../config/firebase');

// fungsi sementara simulasi mqtt
const publishMqttCommand = (topic, message) => {
  console.log(`[Auto-Cancel MQTT] Topic: ${topic} | Payload: ${message}`);
};

const startCronJobs = () => {
  console.log('Memeriksa waktu expired reservation setiap menit...');

  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();

      // testing coba 1 menit biar ga lama
      const timeoutLimit = new Date(now.getTime() - 1 * 60000).toISOString();

      const expiredSnapshot = await db.collection('reservations')
        .where('status', '==', 'pending')
        .where('timestamps.created', '<=', timeoutLimit)
        .get();

      if (expiredSnapshot.empty) {
 
        return;
      }

      console.log(`Menemukan ${expiredSnapshot.size} expires reservasi, membatalkan reservasi...`);

      const batch = db.batch();
      const updates = []; 

      for (const doc of expiredSnapshot.docs) {
        const resData = doc.data();
        const resRef = db.collection('reservations').doc(doc.id);
        const slotRef = db.collection('slots').doc(resData.slotId);
        const ticketRef = db.collection('tickets').doc(resData.ticketId);

        batch.update(resRef, { status: 'cancelled' });

        batch.update(slotRef, { 
          appStatus: 'available',
          currentReservationId: null
        });

        batch.update(ticketRef, { linkedReservationId: null });

        const slotDoc = await slotRef.get();
        if (slotDoc.exists) {
            const { areaId, slotName } = slotDoc.data();
            updates.push(() => publishMqttCommand(`parkfinder/control/${areaId}/${slotName}`, 'setAvailable'));
        }
      }

      await batch.commit();

      updates.forEach(task => task());

      console.log(`✅ Successfully cancelled ${expiredSnapshot.size} reservations.`);

    } catch (error) {
      console.error('❌ Error in Auto-Cancel Cron Job:', error);
    }
  });
};

module.exports = { startCronJobs };