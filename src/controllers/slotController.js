const admin = require('firebase-admin'); // Butuh ini untuk FieldValue
const { db } = require('../config/firebase');
const { createSlotSchema, updateSlotSchema } = require('../models/slotModel');
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
        throw new Error('AreaNotFound'); 
      }

      const sensorCheck = await db.collection('slots')
        .where('sensorId', '==', value.sensorId)
        .get();
      
      if (!sensorCheck.empty) {
        throw new Error('DuplicateSensor');
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

    if (error.message === 'AreaNotFound') {
      return sendError(res, 404, 'ID Area tidak valid.');
    }
    if (error.message === 'DuplicateSensor') {
      return sendError(res, 400, 'Sensor ID sudah digunakan di slot lain.');
    }
    return sendServerError(res, error);
  }
};

// mengambil semua slot parkir
const getSlotsByArea = async (req, res) => {
  try {
    const { id } = req.params;

    const areaDoc = await db.collection('areas').doc(id).get();
    if (!areaDoc.exists) {
      return sendError(res, 404, 'Area parkir tidak ditemukan.');
    }

    const snapshot = await db.collection('slots')
      .where('areaId', '==', id)
      .orderBy('slotName', 'asc') 
      .get();

    const slots = [];
    snapshot.forEach(doc => {
      slots.push({ id: doc.id, ...doc.data() });
    });

    return sendSuccess(res, 200, 'Data slot berhasil diambil.', slots);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// mengambil slot dengan id
const getSlotById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('slots').doc(id).get();

    if (!doc.exists) {
      return sendError(res, 404, 'Slot tidak ditemukan.');
    }

    return sendSuccess(res, 200, 'Detail slot berhasil diambil.', {
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// update slot
const updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error, value } = updateSlotSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const slotRef = db.collection('slots').doc(id);
    const doc = await slotRef.get();
    
    if (!doc.exists) return sendError(res, 404, 'Slot tidak ditemukan.');

    if (value.sensorId && value.sensorId !== doc.data().sensorId) {
      const sensorCheck = await db.collection('slots')
        .where('sensorId', '==', value.sensorId)
        .get();
      
      if (!sensorCheck.empty) {
        return sendError(res, 400, 'Sensor ID sudah digunakan di slot lain.');
      }
    }

    // 4. Update Data
    await slotRef.update({ 
      ...value,
      lastUpdate: new Date().toISOString() 
    });
    
    return sendSuccess(res, 200, 'Data slot berhasil diperbarui.', {
      id,
      ...doc.data(), 
      ...value       
    });

  } catch (error) {
    return sendServerError(res, error);
  }
};

// hapus slot parkir
const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const slotRef = db.collection('slots').doc(id);

    await db.runTransaction(async (t) => {
      const doc = await t.get(slotRef);
      if (!doc.exists) {
        throw new Error('SlotNotFound');
      }

      const slotData = doc.data();

      if (slotData.appStatus === 'occupied' || slotData.appStatus === 'booked') {
        throw new Error('SlotBusy');
      }

      const areaRef = db.collection('areas').doc(slotData.areaId);

      t.delete(slotRef);
      t.update(areaRef, {
        totalSlots: admin.firestore.FieldValue.increment(-1),
        availableSlots: admin.firestore.FieldValue.increment(-1)
      });
    });

    return sendSuccess(res, 200, 'Slot berhasil dihapus permanen.');

  } catch (error) {
    if (error.message === 'SlotNotFound') return sendError(res, 404, 'Slot tidak ditemukan.');
    if (error.message === 'SlotBusy') return sendError(res, 400, 'Gagal menghapus. Slot sedang digunakan atau direservasi.');
    return sendServerError(res, error);
  }
};

module.exports = { addSlot, getSlotsByArea, updateSlot, getSlotById, deleteSlot };