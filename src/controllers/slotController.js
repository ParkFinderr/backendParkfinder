const admin = require('firebase-admin'); // Butuh ini untuk FieldValue
const { db } = require('../config/firebase');
const { createSlotSchema, updateSlotSchema, updateStatusSchema } = require('../models/slotModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');

// menambahkan slot parkir baru
const addSlot = async (req, res) => {
  try {
    
    const { error, value } = createSlotSchema.validate(req.body);
    if (error) {
      return sendError(res, 400, error.details[0].message);
    }

    const areaRef = db.collection('areas').doc(value.areaId);
    const slotRef = db.collection('slots').doc(); 
    
    await db.runTransaction(async (t) => {
      
      const areaDoc = await t.get(areaRef);
      if (!areaDoc.exists) {
        throw new Error('AREA_NOT_FOUND'); 
      }

      const sensorCheck = await db.collection('slots')
        .where('sensorId', '==', value.sensorId)
        .get();
      
      if (!sensorCheck.empty) {
        throw new Error('DUPLICATE_SENSOR');
      }

      const newSlot = {
        areaId: value.areaId,
        floor: value.floor,
        slotName: value.slotName,
        sensorId: value.sensorId,
        sensorStatus: 0,        
        appStatus: 'available',
        currentReservationId: null,
        lastUpdate: new Date().toISOString()
      };

      t.set(slotRef, newSlot);
      t.update(areaRef, {
        totalSlots: admin.firestore.FieldValue.increment(1),
        availableSlots: admin.firestore.FieldValue.increment(1)
      });
    });

    return sendSuccess(res, 201, 'Slot berhasil ditambahkan.', { slotId: slotRef.id });

  } catch (error) {

    if (error.message === 'AREA_NOT_FOUND') {
      return sendError(res, 404, 'ID Area tidak valid.');
    }
    if (error.message === 'DUPLICATE_SENSOR') {
      return sendError(res, 400, 'Sensor ID sudah digunakan di slot lain.');
    }
    return sendServerError(res, error);
  }
};

module.exports = { addSlot };