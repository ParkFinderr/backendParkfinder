// backendApiServices/src/service/sensorListener.js
const { redisClient } = require('../config/redis');
const { db } = require('../config/firebase');

const redisSubscriber = redisClient.duplicate();

const initSensorListener = async () => {
    await redisSubscriber.connect();
    
    console.log('[SENSOR LISTENER] Siap menerima data sensor...');

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

            const oldSensorStatus = slotData.sensorStatus;
            const lastUpdateDate = new Date(slotData.lastUpdate);
            const now = new Date();

            await slotDoc.ref.update({ 
                sensorStatus: sensorValue,
                lastUpdate: now.toISOString()
            });
            
            console.log(`[SENSOR] ${slotName}: ${oldSensorStatus} -> ${sensorValue}`);

            if (sensorValue === 1) {
                
                if (slotData.appStatus === 'available') {
                    console.warn(`ALARM: Parkir Liar di ${slotName} (Available)`);
                    await handleAlert(slotDoc, slotName, 'unauthorized');
                }
                
             
                else if (slotData.appStatus === 'booked' || slotData.appStatus === 'reserved') {
                    if (slotData.currentReservationId) {
                         const resDoc = await db.collection('reservations').doc(slotData.currentReservationId).get();
                         if (resDoc.exists && resDoc.data().status === 'pending') {
                             console.warn(`ALARM: Penyusup di ${slotName} (Booked)`);
                             await handleAlert(slotDoc, slotName, 'wrongParking');
                         }
                    }
                }

                else if (slotData.appStatus === 'occupied') {
                    
                    const diffSeconds = (now - lastUpdateDate) / 1000;

                    if (oldSensorStatus === 0 && diffSeconds > 10) {
                        console.warn(`[GHOST SWAP DETECTED] Slot ${slotName} sempat kosong ${diffSeconds}s lalu terisi lagi.`);
                        
                        if (slotData.currentReservationId) {
                            console.log(`Menyelesaikan sesi lama: ${slotData.currentReservationId}`);
                            
                            await db.collection('reservations').doc(slotData.currentReservationId).update({
                                status: 'completed',
                                'timestamps.completed': new Date().toISOString()
                            });

                        }

                        console.warn(`ALARM: Parkir Liar (Ghost Swap) di ${slotName}`);
                        
                        
                        await slotDoc.ref.update({ 
                            currentReservationId: null,
                          
                        });

                        await redisClient.publish('parkfinderCommands', JSON.stringify({
                            action: 'alertSlot',
                            slotId, slotName, status: 'unauthorized'
                        }));
                    }
                }
            } 
            
            else {
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


const handleAlert = async (slotDoc, slotName, statusInfo) => {

    await slotDoc.ref.update({ appStatus: 'occupied' });
    
    await redisClient.publish('parkfinderCommands', JSON.stringify({
        action: 'alertSlot',
        slotId: slotDoc.id,
        slotName: slotName,
        status: statusInfo
    }));
};

module.exports = { initSensorListener };