const cron = require('node-cron');
const { db } = require('../config/firebase');
const ACTIONS = require('../constants/actions');
const { publishCommand } = require('../helpers/commandHelper');
const { broadcastStats } = require('../helpers/statsHelper'); 

const startCronJobs = () => {
  console.log('[CRON] Sistem pemantauan waktu parkir berjalan...');

  cron.schedule('*/1 * * * *', async () => {
    try {
      const now = new Date();
      const batch = db.batch();
      let hasUpdates = false;
      const redisTasks = [];

      const cancelLimit = new Date(now.getTime() - 30 * 60000).toISOString(); 
      const pendingSnapshot = await db.collection('reservations')
        .where('status', '==', 'pending')
        .where('timestamps.created', '<=', cancelLimit)
        .get();

      if (!pendingSnapshot.empty) {
        console.log(`[AUTO CANCEL] ${pendingSnapshot.size} reservasi expired.`);
        hasUpdates = true;

        for (const doc of pendingSnapshot.docs) {
          const resData = doc.data();
          
          batch.update(db.collection('reservations').doc(doc.id), { status: 'cancelled' });
          batch.update(db.collection('slots').doc(resData.slotId), { 
            appStatus: 'available',
            currentReservationId: null 
          });
          
          redisTasks.push(() => 
             publishCommand(ACTIONS.CANCEL, resData.slotId, 'available', null, 'timeout')
          );
        }
      }

      const checkoutLimit = new Date(now.getTime() - 2 * 60000).toISOString();
      const occupiedSlotsSnapshot = await db.collection('slots')
        .where('appStatus', '==', 'occupied')
        .get();

      if (!occupiedSlotsSnapshot.empty) {
        for (const slotDoc of occupiedSlotsSnapshot.docs) {
          const slotData = slotDoc.data();
          
          if (slotData.sensorStatus === 0 && slotData.lastUpdate <= checkoutLimit) {
             if (slotData.currentReservationId) {
                 console.log(`[AUTO CHECKOUT] ${slotData.slotName}`);
                 hasUpdates = true;

                 batch.update(db.collection('reservations').doc(slotData.currentReservationId), { 
                    status: 'completed',
                    'timestamps.completed': new Date().toISOString()
                 });

                 batch.update(slotDoc.ref, { 
                    appStatus: 'available',
                    currentReservationId: null
                 });
  
                 redisTasks.push(() => 
                    publishCommand(ACTIONS.LEAVE, slotDoc.id, 'available', slotData.slotName, 'auto-checkout')
                 );
             }
          }
        }
      }

      if (hasUpdates) {
        await batch.commit();
        await Promise.all(redisTasks.map(task => task())); 
        await broadcastStats();
        console.log('[CRON] Sinkronisasi selesai.');
      }

    } catch (error) {
      console.error('Error cron:', error);
    }
  });
};

module.exports = { startCronJobs };