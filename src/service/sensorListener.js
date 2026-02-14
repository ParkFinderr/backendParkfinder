const { redisClient } = require('../config/redis');
const { db } = require('../config/firebase');
const ACTIONS = require('../constants/actions');
const { publishCommand } = require('../helpers/commandHelper');
const { broadcastStats } = require('../helpers/statsHelper');

const redisSubscriber = redisClient.duplicate();

const initSensorListener = async () => {
    await redisSubscriber.connect();
    
    console.log('[SENSOR LISTENER] Menunggu data sensor dari Realtime Service...');

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
            
            if (sensorValue === 1) {
                
                if (slotData.appStatus === 'available') {
                    console.warn(`⚠️ ALERT: Parkir Liar di ${slotName}!`);
                    
                    await slotDoc.ref.update({ appStatus: 'occupied' });
                    
                    await publishCommand(ACTIONS.ALERT, slotId, 'occupied', slotName, 'unauthorized');
                    await broadcastStats();
                }
                
                else if (slotData.appStatus === 'booked') {
                    
                    console.warn(`⚠️ ALERT: Mobil masuk di slot booked ${slotName} (Menunggu konfirmasi user)`);
                    await publishCommand(ACTIONS.ALERT, slotId, 'booked', slotName, 'intruder-warning');
                }
            } 
    
            else if (sensorValue === 0) {
    
            }

        } catch (err) {
            console.error('[SENSOR LISTENER ERROR]', err);
        }
    });
};

module.exports = { initSensorListener };