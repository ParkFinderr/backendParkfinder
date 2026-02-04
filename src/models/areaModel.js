// src/models/areaModel.js
const Joi = require('joi');

const areaSchema = Joi.object({
  // name: (string) - nama tempat parkir
  name: Joi.string().required().messages({
    'any.required': 'Nama tempat parkir wajib diisi'
  }),
  
  // address: (string) - alamat lengkap
  address: Joi.string().required(),
  
  // totalFloors: (number) - jumlah total lantai
  totalFloors: Joi.number().integer().min(1).required(),
  
  // totalSlots: (number) - total kapasitas
  totalSlots: Joi.number().integer().min(0).required(),
  
  // availableSlots: (number) - counter real time
  availableSlots: Joi.number().integer().min(0).max(Joi.ref('totalSlots')).required()
});

const validateArea = (data) => {
  return areaSchema.validate(data, { abortEarly: false });
};

module.exports = { validateArea };