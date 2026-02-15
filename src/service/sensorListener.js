const { redisClient } = require('../config/redis');
const { db } = require('../config/firebase');
const ACTIONS = require('../constants/actions');
const { publishCommand } = require('../helpers/commandHelper');
const CHANNELS = require('../constants/channels'); 

const redisSubscriber = redisClient.duplicate();

const initSensorListener = async () => {
    try {
        await redisSubscriber.connect();
        console.log('[SENSOR LISTENER] Menunggu data sensor...');

        await redisSubscriber.subscribe(CHANNELS.REDIS.SENSOR_PUB, async (message) => {
            try {
                const data = JSON.parse(message);

                let { slotName, value, areaId } = data;
            
                if (!slotName || value === undefined) return;
                
                if (!areaId) {
                    console.warn(`[SENSOR IGNORED] Data sensor tanpa Area ID: ${slotName}`);
                    return;
                }

                slotName = slotName.trim();
                const sensorValue = parseInt(value);

                const slotQuery = await db.collection('slots')
                    .where('areaId', '==', areaId)
                    .where('slotName', '==', slotName)
                    .limit(1)
                    .get();

                if (slotQuery.empty) {
                   
                    return;
                }

                const slotDoc = slotQuery.docs[0];
                const slotData = slotDoc.data();
                const slotId = slotDoc.id;

                if (slotData.sensorStatus === sensorValue) return; 

                const now = new Date();
                const lastUpdate = new Date(slotData.lastUpdate);
                
                await slotDoc.ref.update({ 
                    sensorStatus: sensorValue,
                    lastUpdate: now.toISOString()
                });

                if (sensorValue === 1) {
                    
                    if (slotData.appStatus === 'available') {
                        console.warn(`[ANOMALI] Parkir Liar di ${slotName} (Area: ${areaId})`);
                        await slotDoc.ref.update({ appStatus: 'occupied' });
                       
                        await publishCommand(ACTIONS.ALERT, slotId, 'occupied', slotName, 'unauthorized', areaId);
                    }
                    
                    else if (slotData.appStatus === 'booked') {
                        console.warn(`[ANOMALI] Masuk Slot Booked ${slotName} (Area: ${areaId})`);
                        await publishCommand(ACTIONS.ALERT, slotId, 'booked', slotName, 'intruder-warning', areaId);
                    }

                    else if (slotData.appStatus === 'occupied') {
                         const diffSeconds = (now - lastUpdate) / 1000;
                         if (diffSeconds < 60) {
                             console.warn(`[ANOMALI] Ghost Swap Terdeteksi di ${slotName}`);
                             
                             if (slotData.currentReservationId) {
                                 await db.collection('reservations').doc(slotData.currentReservationId).update({
                                     status: 'completed',
                                     'timestamps.completed': now.toISOString(),
                                     note: 'forced_by_ghost_swap'
                                 });
                             }
                             
                             await slotDoc.ref.update({ currentReservationId: null });
                             await publishCommand(ACTIONS.ALERT, slotId, 'occupied', slotName, 'ghost-swap', areaId);
                         }
                    }
                }

                else if (sensorValue === 0) {
                    console.log(`[INFO] Mobil keluar dari ${slotName} (Area: ${areaId})`);

                    if (slotData.appStatus === 'occupied') {
                        
                        if (!slotData.currentReservationId) {
                            console.log(`[AUTO RESET] Parkir Liar selesai di ${slotName}. Reset ke Available.`);
                            
                            await slotDoc.ref.update({ appStatus: 'available' });
                            
                            await publishCommand(ACTIONS.LEAVE, slotId, 'available', slotName, 'unauthorized-leave', areaId);
                        }
                        
                        else {
                            console.log(`[INFO] Menunggu konfirmasi checkout user atau auto checkout.`);
                        }
                    }
                }

            } catch (err) {
                console.error('[SENSOR ERROR]', err);
            }
        });

    } catch (err) {
        console.error('[SENSOR LISTENER FATAL]', err);
    }
};

module.exports = { initSensorListener };