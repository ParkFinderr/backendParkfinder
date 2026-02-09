const Joi = require('joi');

// membuat area
const createAreaSchema = Joi.object({
  name: Joi.string().min(3).required().messages({
    'string.empty': 'Nama area parkir wajib diisi.',
    'string.min': 'Nama area parkir minimal 3 karakter.'
  }),
  address: Joi.string().required().messages({
    'string.empty': 'Alamat wajib diisi.'
  }),
  totalFloors: Joi.number().integer().min(1).required().messages({
    'number.base': 'Jumlah lantai harus berupa angka.',
    'number.min': 'Minimal harus ada 1 lantai.'
  })
});

// update area
const updateAreaSchema = Joi.object({
  name: Joi.string().min(3).optional(),
  address: Joi.string().optional(),
  totalFloors: Joi.number().integer().min(1).optional()
});

module.exports = { createAreaSchema, updateAreaSchema };