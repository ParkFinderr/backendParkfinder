const cron = require('node-cron');
const { db } = require('../config/firebase');
const { redisClient } = require('../config/redis');

const startCronJobs = () => {
  console.log('Memeriksa waktu expired reservation setiap menit...');

  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();

      const timeoutLimit = new Date(now.getTime() - 1 * 60000).toISOString(); 

      const expiredSnapshot = await db.collection('reservations')
        .where('status', '==', 'pending')
        .where('timestamps.created', '<=', timeoutLimit)
        .get();

      if (expiredSnapshot.empty) {
        return;
      }

      console.log(`Menemukan ${expiredSnapshot.size} reservasi expired. Membatalkan...`);

      const batch = db.batch();
      const notificationTasks = [];

      for (const doc of expiredSnapshot.docs) {
        const resData = doc.data();
        
        const resRef = db.collection('reservations').doc(doc.id);
        const slotRef = db.collection('slots').doc(resData.slotId);
        const ticketRef = db.collection('tickets').doc(resData.ticketId);

        // 1. Update Database (Batch)
        batch.update(resRef, { status: 'cancelled' });
        batch.update(slotRef, { 
          appStatus: 'available',
          currentReservationId: null
        });
        batch.update(ticketRef, { linkedReservationId: null });

        const slotDoc = await slotRef.get();
        if (slotDoc.exists) {
            const { slotName } = slotDoc.data();
            
            notificationTasks.push(async () => {
                const commandPayload = {
                    action: 'cancelSlot',
                    slotId: resData.slotId,
                    slotName: slotName,
                    status: 'available'
                };

                try {
                    await redisClient.publish('parkfinderCommands', JSON.stringify(commandPayload));
                    console.log(`Mengirim perintah cancelSlot untuk ${slotName}`);
                } catch (err) {
                    console.error('[CronRedisError]', err);
                }
            });
        }
      }

      await batch.commit();

      await Promise.all(notificationTasks.map(task => task()));

      console.log(`Sukses membatalkan ${expiredSnapshot.size} reservasi.`);

    } catch (error) {
      console.error('Error in Auto Cancel Cron Job:', error);
    }
  });
};

module.exports = { startCronJobs };