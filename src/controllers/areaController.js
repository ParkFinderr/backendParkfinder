const { db } = require('../config/firebase');
const { createAreaSchema, updateAreaSchema } = require('../models/areaModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');

// menambahkan area parkir 
const createArea = async (req, res) => {
  try {

    const { error, value } = createAreaSchema.validate(req.body);
    if (error) {
      return sendError(res, 400, error.details[0].message);
    }

    const newArea = {
      name: value.name,
      address: value.address,
      totalFloors: value.totalFloors,
      totalSlots: 0,     
      availableSlots: 0,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('areas').add(newArea);

    return sendSuccess(res, 201, 'Area parkir berhasil dibuat.', {
      areaId: docRef.id,
      ...newArea
    });

  } catch (error) {
    return sendServerError(res, error);
  }
};

// mengambil semua area parkir
const getAllAreas = async (req, res) => {
  try {
    const snapshot = await db.collection('areas').get();
    
    if (snapshot.empty) {
      return sendSuccess(res, 200, 'Belum ada area parkir yang terdaftar.', []);
    }

    const areas = [];
    snapshot.forEach(doc => {
      areas.push({ id: doc.id, ...doc.data() });
    });

    return sendSuccess(res, 200, 'Daftar area parkir berhasil diambil.', areas);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// mengambil area dengan id
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('areas').doc(id).get();

    if (!doc.exists) {
      return sendError(res, 404, 'Area parkir tidak ditemukan.');
    }

    return sendSuccess(res, 200, 'Detail area berhasil diambil.', {
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// hapus area
const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    const areaRef = db.collection('areas').doc(id);

    const doc = await areaRef.get();
    if (!doc.exists) {
      return sendError(res, 404, 'Area parkir tidak ditemukan.');
    }

    const slotsSnapshot = await db.collection('slots')
      .where('areaId', '==', id)
      .limit(1)
      .get();

    if (!slotsSnapshot.empty) {
      return sendError(res, 400, 'Gagal menghapus. Area ini masih memiliki Slot Parkir. Hapus semua slot terlebih dahulu.');
    }

    await areaRef.delete();

    return sendSuccess(res, 200, 'Area parkir berhasil dihapus.');

  } catch (error) {
    return sendServerError(res, error);
  }
};

// update area
const updateArea = async (req, res) => {
  try {
    const { id } = req.params;

    const { error, value } = updateAreaSchema.validate(req.body);
    if (error) {
      return sendError(res, 400, error.details[0].message);
    }

    const areaRef = db.collection('areas').doc(id);
    const doc = await areaRef.get();

    if (!doc.exists) {
      return sendError(res, 404, 'Area parkir tidak ditemukan.');
    }

    await areaRef.update({
      ...value,
      updatedAt: new Date().toISOString()
    });

    return sendSuccess(res, 200, 'Informasi area parkir berhasil diperbarui.');

  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { createArea, getAllAreas, deleteArea, updateArea, getAreaById };