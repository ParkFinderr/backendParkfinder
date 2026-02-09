const Joi = require('joi');

// skema slot parkir
const createSlotSchema = Joi.object({
  areaId: Joi.string().required().messages({ 'string.empty': 'ID Area wajib diisi.' }),
  floor: Joi.number().integer().required(),
  slotName: Joi.string().required(),
  sensorId: Joi.string().required()
});

// updte slot parkir
const updateSlotSchema = Joi.object({
  floor: Joi.number().integer().optional(),
  slotName: Joi.string().optional(),
  sensorId: Joi.string().optional(),
  
  appStatus: Joi.string().valid('available', 'maintenance', 'occupied').optional().messages({
    'any.only': 'Status hanya boleh: available, maintenance, atau occupied.'
  })
});


module.exports = { createSlotSchema, updateSlotSchema };