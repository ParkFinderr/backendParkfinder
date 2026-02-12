// backendApiServices/src/service/sensorListener.js
const { redisClient } = require('../config/redis');
const { db } = require('../config/firebase');

const redisSubscriber = redisClient.duplicate();

const initSensorListener = async () => {
    await redisSubscriber.connect();
    
    console.log('Siap menerima data sensor dari Realtime Service...');

    await redisSubscriber.subscribe('parkfinderSensorUpdate', async (message) => {
        try {
            const data = JSON.parse(message);
            const { slotName, value } = data;
            const sensorValue = parseInt(value);

            const slotQuery = await db.collection('slots').where('slotName', '==', slotName).limit(1).get();
            if (slotQuery.empty) return; 

            const slotDoc = slotQuery.docs[0];
            const slotData = slotDoc.data();
            const slotId = slotDoc.id;

            await slotDoc.ref.update({ 
                sensorStatus: sensorValue,
                lastUpdate: new Date().toISOString()
            });
            
            console.log(`[SENSOR UPDATE] ${slotName} status fisik: ${sensorValue}`);

            // sensor mendeteksi mobil masuk
            if (sensorValue === 1) {
                
                // parkir liar
                if (slotData.appStatus === 'available') {
                    console.warn(`⚠️ ALARM: Parkir Liar terdeteksi di ${slotName}!`);
                    
                    await slotDoc.ref.update({ appStatus: 'occupied' });
                    
                    await redisClient.publish('parkfinderCommands', JSON.stringify({
                        action: 'alertSlot',
                        slotId, slotName, status: 'unauthorized'
                    }));
                }
                
                //  salah parkir
                else if (slotData.appStatus === 'booked' || slotData.appStatus === 'reserved') {
                    if (slotData.currentReservationId) {
                         const resDoc = await db.collection('reservations').doc(slotData.currentReservationId).get();
                    
                         if (resDoc.exists && resDoc.data().status === 'pending') {
                             console.warn(`⚠️ ALARM: Penyusup (Salah Parkir) di ${slotName}!`);
                             
                             await redisClient.publish('parkfinderCommands', JSON.stringify({
                                action: 'alertSlot',
                                slotId, slotName, status: 'wrongParking'
                            }));
                         }
                    }
                }
            } 
            
            // mobil keluar
            else {
                 // sebelumnya parkir liar
                 if (slotData.appStatus === 'occupied' && !slotData.currentReservationId) {
                     console.log(`Parkir liar pergi dari ${slotName}, reset status.`);
                     
                     await slotDoc.ref.update({ appStatus: 'available' });
                     
                     await redisClient.publish('parkfinderCommands', JSON.stringify({
                        action: 'leaveSlot', slotId, slotName, status: 'available'
                    }));
                 }
            }

        } catch (error) {
            console.error('[SENSOR LISTENER ERROR]', error);
        }
    });
};

module.exports = { initSensorListener };