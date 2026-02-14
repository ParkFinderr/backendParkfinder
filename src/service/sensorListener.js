const { redisClient } = require('../config/redis');
const { db } = require('../config/firebase');
const ACTIONS = require('../constants/actions');
const { publishCommand } = require('../helpers/commandHelper');
const { broadcastStats } = require('../helpers/statsHelper');
const CHANNELS = require('../constants/channels'); 

const redisSubscriber = redisClient.duplicate();

const initSensorListener = async () => {
    try {
        await redisSubscriber.connect();
        console.log('[SENSOR LISTENER] Menunggu data sensor...');

        await redisSubscriber.subscribe(CHANNELS.REDIS.SENSOR_PUB, async (message) => {
            try {
                const data = JSON.parse(message);
                let { slotName, value } = data;
            
                if (!slotName || value === undefined) return;

                slotName = slotName.trim();
                const sensorValue = parseInt(value);

                const slotQuery = await db.collection('slots')
                    .where('slotName', '==', slotName)
                    .limit(1)
                    .get();

                if (slotQuery.empty) {
                    console.warn(`[SENSOR WARN] Slot '${slotName}' tidak ditemukan di DB.`);
                    return;
                }

                const slotDoc = slotQuery.docs[0];
                const slotData = slotDoc.data();
                const slotId = slotDoc.id;

                await slotDoc.ref.update({ 
                    sensorStatus: sensorValue,
                    lastUpdate: new Date().toISOString()
                });

                if (sensorValue === 1) {
                    
                    if (slotData.appStatus === 'available') {
                        console.warn(`ALERT: Parkir Liar di ${slotName}!`);
                        
                        await slotDoc.ref.update({ appStatus: 'occupied' });
                        await publishCommand(ACTIONS.ALERT, slotId, 'occupied', slotName, 'unauthorized');
                        await broadcastStats();
                    }

                    else if (slotData.appStatus === 'booked') {
                        console.warn(`ALERT: Mobil masuk slot booked ${slotName}`);
                        await publishCommand(ACTIONS.ALERT, slotId, 'booked', slotName, 'intruder-warning');
                    }
                }

            } catch (err) {
                console.error('[SENSOR PROC ERROR]', err);
            }
        });

    } catch (err) {
        console.error('[SENSOR LISTENER FATAL]', err);
    }
};

module.exports = { initSensorListener };