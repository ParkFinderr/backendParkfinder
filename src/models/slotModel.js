const Joi = require('joi');

// membuat slot baru
const createSlotSchema = Joi.object({
  areaId: Joi.string().required().messages({
    'string.empty': 'ID Area wajib diisi.'
  }),
  floor: Joi.number().integer().required().messages({
    'number.base': 'Lantai harus berupa angka.'
  }),
  slotName: Joi.string().required().messages({
    'string.empty': 'Nama slot (contoh: A-1) wajib diisi.'
  }),
  sensorId: Joi.string().required().messages({
    'string.empty': 'ID Sensor (Hardware) wajib diisi.'
  })
});

// update slot baru
const updateSlotSchema = Joi.object({
  floor: Joi.number().integer().optional(),
  slotName: Joi.string().optional(),
  sensorId: Joi.string().optional()
});

// update status slot
const updateStatusSchema = Joi.object({
  status: Joi.string().valid('available', 'maintenance').required().messages({
    'any.only': 'Status hanya boleh: available atau maintenance.'
  })
});

module.exports = { 
  createSlotSchema, 
  updateSlotSchema, 
  updateStatusSchema 
};