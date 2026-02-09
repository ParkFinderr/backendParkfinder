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

module.exports = { createArea };