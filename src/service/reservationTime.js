const cron = require('node-cron');
const { db } = require('../config/firebase');
const { redisClient } = require('../config/redis');

const startCronJobs = () => {
  console.log('[CRON] Sistem pemantauan waktu parkir berjalan...');

  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();
      const batch = db.batch();
      let hasUpdates = false;
      const redisTasks = [];

     // auto cancel
      const cancelLimit = new Date(now.getTime() - 30 * 60000).toISOString(); 

      const pendingSnapshot = await db.collection('reservations')
        .where('status', '==', 'pending')
        .where('timestamps.created', '<=', cancelLimit)
        .get();

      if (!pendingSnapshot.empty) {
        console.log(`[AUTO CANCEL] Membatalkan ${pendingSnapshot.size} booking expired.`);
        hasUpdates = true;

        for (const doc of pendingSnapshot.docs) {
          const resData = doc.data();
          
          batch.update(db.collection('reservations').doc(doc.id), { status: 'cancelled' });
          batch.update(db.collection('slots').doc(resData.slotId), { 
            appStatus: 'available',
            currentReservationId: null 
          });
          
          redisTasks.push(async () => {
             await publishCommand('cancelSlot', resData.slotId, 'available');
          });
        }
      }

      // auto checkout
      const checkoutLimit = new Date(now.getTime() - 2 * 60000).toISOString();

      const occupiedSlotsSnapshot = await db.collection('slots')
        .where('appStatus', '==', 'occupied')
        .get();

      if (!occupiedSlotsSnapshot.empty) {
        for (const slotDoc of occupiedSlotsSnapshot.docs) {
          const slotData = slotDoc.data();
          
          if (slotData.sensorStatus === 0 && slotData.lastUpdate <= checkoutLimit) {
             
             if (slotData.currentReservationId) {
                 console.log(`[AUTO CHECKOUT] User lupa checkout di ${slotData.slotName}. Menyelesaikan otomatis...`);
                 hasUpdates = true;

                 const resRef = db.collection('reservations').doc(slotData.currentReservationId);
                 batch.update(resRef, { 
                    status: 'completed',
                    'timestamps.completed': new Date().toISOString()
                 });

                 batch.update(slotDoc.ref, { 
                    appStatus: 'available',
                    currentReservationId: null
                 });
  
                 redisTasks.push(async () => {
                    await publishCommand('leaveSlot', slotDoc.id, 'available', slotData.slotName);
                 });
             }
          }
        }
      }

      if (hasUpdates) {
        await batch.commit();
        await Promise.all(redisTasks.map(task => task()));
        console.log('[CRON] Sinkronisasi data selesai.');
      }

    } catch (error) {
      console.error('❌ Error in Cron Job:', error);
    }
  });
};


const publishCommand = async (action, slotId, status, slotName = null) => {
    try {

        let name = slotName;
        if (!name) {
            const slotDoc = await db.collection('slots').doc(slotId).get();
            if (slotDoc.exists) name = slotDoc.data().slotName;
        }

        if (name) {
            const payload = {
                action: action,
                slotId: slotId,
                slotName: name,
                status: status
            };
            await redisClient.publish('parkfinderCommands', JSON.stringify(payload));
            console.log(`[REDIS CRON] Sent ${action} for ${name}`);
        }
    } catch (err) {
        console.error('[REDIS ERROR]', err);
    }
};

module.exports = { startCronJobs };